document.querySelector('.overview').addEventListener('click', () => {
    window.open('http://dash.sjdev.in/overview','_self')
})

document.querySelector('.log').addEventListener('click', () => {
    window.open('http://dash.sjdev.in/log','_self')
})

document.querySelector('.spreadsheet').addEventListener('click', () => {
    window.open('http://dash.sjdev.in/spreadsheet','_self')
})

document.querySelector('.preferences').addEventListener('click', () => {
    window.open('http://dash.sjdev.in/preferences','_self')
})

let name = document.cookie.split('=')[1].replace(';','')
document.querySelector('.s1-name').innerHTML = name.charAt(0).toUpperCase() + name.slice(1,name.length);
document.querySelector('.s1-initial').innerHTML = name.charAt(0).toUpperCase() 