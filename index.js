const express = require('express');
const fs = require('fs');
const app = new express();
const cookieParser = require('cookie-parser')
const fetch = require('node-fetch');
const { nextTick } = require('process');
app.use(express.static('public'))
app.use(express.json());
app.use(cookieParser())
app.get('/', (req, res) => {
    res.redirect('/overview')
})

let userList = ['shivansh','arpit','genius'];

// Authentication (weird one)
app.use('/', (req, res, next) => {
    if(req.originalUrl == '/fetch/users'){
        next();
    }else{
        if(!['shivansh','arpit','genius'].includes(req.cookies.user)) return res.sendFile(__dirname + '/public/user.html');
        req.user = req.cookies.user;
        next(); 
    }
})

app.get('/fetch/users', (req, res) => {
    return res.send({
        code: 404,
        error: {
            'message':'Who is using this account?',
            'data':['shivansh','arpit','genius']
        }
    })
})

function objectMap(obj, func) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, func(v)]));
}

app.get('/fetch/overview', async (req, res) => {
    let data = await JSON.parse(fs.readFileSync(`./data/${req.user}_d.json`, 'utf8'));
    let config = await JSON.parse(fs.readFileSync(`./data/${req.user}.json`, 'utf8'));
    let array = {};
    let weak_s= config.configs.weak, strong_s = config.configs.strong, revision_interval = config.configs.revision_interval; 

    Object.keys(data).forEach(i => {
        subject = '';
        if(i == 'Organic' || i == 'Physical' || i == 'Inorganic') {
            subject = 'Chemistry';
        }else{
            subject = i;
        }
        array[subject] = array[subject] == undefined ? [] : array[subject];
        Object.keys(data[i]).forEach(x => {
            let temp = {}, ref = data[i][x];
            temp['priority'] = ref.priority;
            temp['topic'] = x;
            temp['days'] = (new Date() - ref.last)/(24*60*60*1000);
            temp['score'] = ref.score;
            temp['active'] = ref.last !== '';
            array[subject] = [...array[subject], temp];
        })
    })

    let revisionTopics = objectMap(array, (v) => {
        return v.filter(i => {
            if((i.active == true) && (i.days >= revision_interval*(i.score/60))){
                return i;
            }
        }).sort((i,b) => i.score - b.score).slice(0,5).map(i => i.topic)
    })
    let strong = objectMap(array, (v) => {
        console.log(v.filter(i => i.score >= strong_s), strong_s);
        return v.filter(i => i.score >= strong_s && i.active).sort((i,b) => -1*(i.priority - b.priority || i.score - b.score)).slice(0,3).map(i => `${i.topic} (${(i.score).toFixed(2)})`);
    });
    let weak = objectMap(array, (v) => {
        return v.filter(i => i.score <= weak_s && i.active).sort((i,b) => -1*(i.priority - b.priority || i.score - b.score)).slice(0,3).map(i => `${i.topic} (${(i.score).toFixed(2)})`);
    });
    let lastDone = objectMap(array, (v) => {
        return v.filter(i => i.active && i.days >= revision_interval).sort((i,b) => -1*(i.last - b.last)).slice(0,3).map(i => i.topic);
    })

    res.send({
        topics: revisionTopics,
        last: lastDone,
        weak: weak,
        strong: strong
    })
})

app.post('/addLog', async (req, res) => {
    let { topic, subject, oc, hc, mc, ec, total, time, errors } = req.body;

    let data = await JSON.parse(fs.readFileSync(`./data/${req.user}_d.json`, 'utf8'));
    let config = await JSON.parse(fs.readFileSync(`./data/${req.user}.json`, 'utf8'));
    let times = config.times;
    let object = data[subject][topic];

    solved_t = (+hc) + (+mc) + (+ec) + (+oc);
    error_t = 0;
    object['ec'] += (+ec);
    object['hc'] += (+hc);
    object['oc'] += (+oc);
    object['mc'] += (+mc);
    object['time'] += +time;
    object['solved'] += (+hc) + (+mc) + (+ec) + (+oc);
    object['total'] += +total;
    object['last'] = new Date().getTime();
    object['active'] = true;

    Object.keys(errors).forEach(i => {
        object[i] += errors[i]
        error_t += errors[i];
    })

    let solved_scr = (object.solved/object.total)*(1-5*((solved_t/(+total)) - (object.solved/object.total)));
    let time_scr = (times[subject]/((+time)/(((+solved_t)+(+total))/2)));
    let average = (solved_t/(+total));

    console.log(solved_scr, time_scr, average, (hc + mc/2 + ec/3 + oc*2)/total, ((+hc) + (+mc)/2 + (+ec)/3 + (+oc)*2))
    let score = 40*solved_scr + 20*(((+hc) + (+mc)/2 + (+ec)/3 + (+oc)*2)/total)*time_scr + 40*average;

    object['score'] = score;

    data[subject][topic] = object;
    fs.writeFileSync(`./data/${req.user}_d.json`,JSON.stringify(data),'utf8')
})

app.get('/fetch/update', async (req, res) => {
    let {subject,topic,status} = req.query;
    console.log(req.query)
    let data = await JSON.parse(fs.readFileSync(`./data/${req.user}_d.json`, 'utf8'));
    let object = data[subject][topic];
    object['active'] = +(status);
    fs.writeFileSync(`./data/${req.user}_d.json`,JSON.stringify(data),'utf8')
    res.send('done lol')
})

app.get('/fetch/log', async (req, res) => {
    let data = await JSON.parse(fs.readFileSync(`./data/${req.user}_d.json`, 'utf8'));
    let subjects = Object.keys(data);
    let response = {};
    subjects.forEach((i) => {
        response[i] = Object.keys(data[i]);
    })
    res.send(response)
})

app.get('/fetch/spreadsheet', async (req, res) => {
    let data = await JSON.parse(fs.readFileSync(`./data/${req.user}_d.json`, 'utf8'));
    res.send(data);
})

app.get('/fetch/preferences', async (req, res) => {
    let config = await JSON.parse(fs.readFileSync(`./data/${req.user}.json`, 'utf8'));
    let { Physics, Maths, Organic, Inorganic, Physical } = config.times;
    let { strong, weak, revision_interval } = config.configs;
    res.send({
        a: revision_interval,
        b: strong,
        c: weak,
        d: Organic,
        e: Inorganic,
        f: Physical,
        g: Physics,
        h: Maths
    })
})

app.post('/update/preferences', async (req, res) => {
    try{
        fs.writeFileSync(`./data/${req.user}.json`, JSON.stringify(req.body));
        res.send({
            code: 200
        })
    }catch(err){
        console.log(err)
        res.send({
            code: 400,
            message: 'Unexpected error!'
        })
    }
})

app.get('/overview', (req, res) => {
    res.sendFile(__dirname + '/public/overview.html')
})

app.get('/preferences', (req, res) => {
    res.sendFile(__dirname + '/public/preferences.html')
})

app.get('/spreadsheet', (req, res) => {
    res.sendFile(__dirname + '/public/spreadsheet.html')
})

app.get('/log', (req, res) => {
    res.sendFile(__dirname + '/public/log.html')
})

app.listen(1800, 'localhost', () => {
    console.log('listening')
})