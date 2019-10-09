//Delete Local Storage Func

const delete_storage = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('expired');
}

// Check Token Fun

const check_token = () => {
    if(localStorage.getItem('expired')- Date.now() <= 0 && localStorage.getItem('token')){
        delete_storage ();
        alert('Login Session Over');
        return setTimeout(function() {document.location.assign('/signin.html')}, 3000);
    }
}

const check_token_profile = () => {
    if(!localStorage.getItem('token') || !localStorage.getItem('expired')){
    return document.location.assign('/signin.html');
} else if(localStorage.getItem('expired') - Date.now() <= 0 ){
    delete_storage ();
    return document.location.assign('/signin.html');
}
}

