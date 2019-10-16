const express = require('express');
const connection = require('../database/dbconnect');
const router = express.Router();
const path = require('path');
const  crypto = require('crypto');
var request = require('request');

router.use(express.json());

// Account related website
router.get('/account_signup', (req, res) => {
    res.render('signup');
    
});

router.get('/account_signin', (req, res) => {
    res.render('signin');
});


//SIGN UP

router.post('/signup', (req,res) => {

    if(req.header('Content-Type') !== "application/json") {
        res.json({"error": "Header is not in application/json"});
    } else {

        let errMsg = JSON.parse('{"error" : "Invalid token"}');
        let same_email = JSON.parse('{"same_email" : "same_email"}');

        let { name, email, password} = req.body;
        let profile_picture = './profile_pic.jpg';
        let provider = "native";
        email.toLowerCase();
        name.toLowerCase();
     
        connection.query(`SELECT users.email, users.provider FROM users WHERE email = '${email}' and provider = "native"`, (err, result) => {
            if(err) return res.json(same_email);
            if(result.length !== 0){
                return res.json(same_email);
            } else {
                password = crypto.createHash('sha256').update(password + 'guessmypassword' + email).digest('hex');
                const user_data = { name:name, email:email, password:password, provider:provider, picture:profile_picture }
                connection.query('INSERT INTO users SET ?', user_data, (err, result) => {
                    let access_expired = Date.now() + 7.2e+6;
                    let access_token = crypto.createHash('sha256').update(email + 'iamaboss' + Date.now()).digest('hex');
                    let id = result.insertId;
                    let token_data = { email:email, access_expired:access_expired, access_token:access_token, access_expired:access_expired }
                    connection.query('INSERT INTO authentication_tokens SET ?', token_data, (err, result) => {
                        if(err) return res.json(err);
                        connection.query(`SELECT users.id, users.provider, users.name, users.email, users.picture FROM users WHERE email = '${email}' AND id = ${id}`, (err,result) => {
                            if(err) return res.json(err);
                            let users = {id:result[0].id, provider:result[0].prodiver, name:result[0].name,email:result[0].email ,picture:result[0].picture}
                            
                            connection.query(`SELECT authentication_tokens.access_token,  authentication_tokens.access_expired FROM authentication_tokens WHERE email = '${email}' AND id = ${id}`, (err,result) => {
                                if(err) {
                                    return res.json(err);
                                } else {
                                    
                                    if(result[0].access_expired - Date.now() <=0){
                                        var time_left = 0;
                                    } else {
                                        var time_left =  result[0].access_expired - Date.now();
                                    }
                                    let datas = {access_token: result[0].access_token, access_expired: time_left, expired_time:result[0].access_expired, user:users};
                                    container = { data: datas }
                                    res.json(container);
                                }
                            })
                        })
                    })
                });
            }
        })
            
        
        
    }
})

// SIGN IN

router.post('/signin', (req,res) => {
    
    let errMsg = JSON.parse('{"error" : "Invalid token"}');
    
    if(req.header('Content-Type') !== "application/json") {
        res.json({"error": "Header is not in application/json"})
    } else {
        
        var { email, password, provider, access_token } = req.body;
        
        
        if( !provider ){
            return res.json(err);
        } else {
        
            if(provider === "native"){
                email.toLowerCase();
                password  = crypto.createHash('sha256').update(password + 'guessmypassword' + email).digest('hex');
                connection. query(`SELECT * FROM users WHERE email = '${email}' and password = '${password}'`, (err, result) => {
                  
                    if (err) return res.json(err);
                    if (result.length === 0){
                        return res.json(errMsg);
                    } else {    
                        let users = {id:result[0].id, provider:result[0].provider, name:result[0].name,email:result[0].email ,picture:result[0].picture}
                        let id = result[0].id;
                        let new_token = crypto.createHash('sha256').update(email + 'iamaboss' + Date.now()).digest('hex');
                        let new_timestamp = Date.now() + 7.2e+6; 
                        connection.query(`UPDATE authentication_tokens SET access_token = '${new_token}', access_expired = '${new_timestamp}' WHERE email = '${email}' AND id = '${id}'`, (err, result) => {
                            if(err) return res.json(err);
                            
                        })
                        connection.query(`SELECT authentication_tokens.access_token,  authentication_tokens.access_expired FROM authentication_tokens WHERE email = '${email}' AND id = '${id}'`, (err,result) => {
                            
                            if(err) {
                                return res.json(err);
                            } else {
                                
                                if(result[0].access_expired - Date.now() <=0){
                                    var time_left = 0;
                                } else {
                                    var time_left =  result[0].access_expired - Date.now();
                                }
                                let datas = {access_token: result[0].access_token, access_expired: time_left, expired_time:new_timestamp, user:users}
                                container = { data: datas }
                                res.json(container);
                            }
                        })
                    }
                });
            } else if (provider === 'facebook') {
                
                let fb_path = `https://graph.facebook.com/v4.0/me?fields=name,email,picture.height(350).width(350)&access_token=${access_token}`
                request(fb_path, function (err, response, body) {
                  
                    if(err || response.statusCode !== 200) {
                        res.send('Access Denied');
                    } else {
                        let body_info = JSON.parse(body);
                        
                        connection.query(`SELECT * FROM users WHERE email = '${body_info.email}' and provider = 'facebook'`, (err, result) => {
                            if(err) return res.json(err);
                           
                            if(result.length !== 0){
                                let users = {id:result[0].id, provider:result[0].provider, name:result[0].name,email:result[0].email ,picture:result[0].picture}
                                let user_name = result[0].name;

                                let new_token = crypto.createHash('sha256').update(email + 'iamaboss' + Date.now()).digest('hex');
                                let new_timestamp = Date.now() + 7.2e+6; 
                                connection.query(`UPDATE authentication_tokens SET access_token = '${new_token}', access_expired = '${new_timestamp}' WHERE email = '${body_info.email}' AND id = ${users.id}`, (err, result) => {
                                    if(err) return res.json(err);
                                    
                                })
                                let user_pic_update = body_info.picture.data.url
                                connection.query(`UPDATE users SET name = '${user_name}', picture = '${user_pic_update}' WHERE email = '${body_info.email}' AND provider = "facebook"`, (err, result) => {
                                    if(err) return res.json(err);
                                    
                                });
                                connection.query(`SELECT authentication_tokens.access_token,  authentication_tokens.access_expired FROM authentication_tokens WHERE email = '${body_info.email}' AND id = ${users.id}`, (err,result) => {
                                
                                if(err) {
                                    return res.json(err);
                                } else {
                                    if(result[0].access_expired - Date.now() <=0){
                                    var time_left = 0;
                                } else {
                                    var time_left =  result[0].access_expired - Date.now();
                                }
                                let datas = {access_token: result[0].access_token, access_expired: time_left,expired_time:new_timestamp, user:users}
                                container = { data: datas }
                                res.json(container);
                            }
                        })
                            } else {
                                let password = crypto.createHash('sha256').update('thisisfblogin').digest('hex');
                                
                                const fb_user_data = { name:body_info.name, email:body_info.email, password:password, provider:provider, picture:body_info.picture.data.url }
                                connection.query('INSERT INTO users SET ?', fb_user_data, (err, result) => {
                                let access_expired = Date.now() + 7.2e+6;
                                let access_token = crypto.createHash('sha256').update(email + 'iamaboss' + Date.now()).digest('hex');
                                let id = result.insertId;
                                let token_data = { email:fb_user_data.email, access_expired:access_expired, access_token:access_token, access_expired:access_expired }
                                connection.query('INSERT INTO authentication_tokens SET ?', token_data, (err, result) => {
                                    if(err) return res.json(err);
                                        connection.query(`SELECT users.id, users.provider, users.name, users.email, users.picture FROM users WHERE email = '${fb_user_data.email}' AND id=${id}`, (err,result) => {
                                            if(err) return res.json(err);
                                            let users = {id:result[0].id, provider:result[0].prodiver, name:result[0].name, email:result[0].email, picture:result[0].picture}
                                        
                                            connection.query(`SELECT authentication_tokens.access_token,  authentication_tokens.access_expired FROM authentication_tokens WHERE email = '${fb_user_data.email}' AND id=${id}`, (err,result) => {
                                                if(err) {
                                                    return res.json(err);
                                                } else {
                                                    
                                                    if(result[0].access_expired - Date.now() <=0){
                                                        var time_left = 0;
                                                    } else {
                                                        var time_left =  result[0].access_expired - Date.now();
                                                    }
                                                    let datas = {access_token: result[0].access_token, access_expired: time_left, user:users};
                                                    container = { data: datas }
                                                    res.json(container);
                                                }
                                             })
                                        })
                                    })
                                });
                            }
                        });
                        
                    }
                    
                });
                
            }
        }   
    } 
});

//Profile

router.get('/profile', (req, res) => {
    
    let bearer = req.headers.authorization.split(' ')[0];
    let token = req.headers.authorization.split(' ')[1];
    let errMsg = JSON.parse('{"error" : "Invalid token"}');
    if(!req.headers.authorization || bearer !== 'Bearer'){
        return res.json(errMsg);
    } else {
        connection.query(`SELECT users.id, users.provider, users.name, users.email, users.picture, authentication_tokens.access_token, authentication_tokens.access_expired FROM authentication_tokens JOIN users ON users.id = authentication_tokens.id WHERE access_token = '${token}'`, (err, result) => {
            
            if (err) return res.json(err);
            
            if (result.length === 0 || result === undefined) {
                
                res.redirect('/user/account_signin')
            } else if (result[0].access_expired - Date.now() <= 0 ) {
                
                res.redirect('/user/account_signin') 
            } else {
                let datas = {id:result[0].id, provider:result[0].provider, name:result[0].name,email:result[0].email ,picture:result[0].picture}
                container = { data: datas }
                res.json(container)
            }
        })
    }
})




module.exports = router;