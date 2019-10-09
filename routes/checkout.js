const express = require('express');
const connection = require('../database/dbconnect');
const router = express.Router();
const path = require('path');
const crypto = require('crypto');
const async = require('async');
const request = require('request');

router.use(express.json());

router.get('/checkout.html', (req, res) => {
    res.render('checkout');
  });

router.post('/checkout', (req, res) => {
  var errMsg = JSON.parse('{"error" : "Invalid token"}');

  if(req.header('Content-Type') !== "application/json") {
    res.json({"error": "Header is not in application/json"});
  } else {

    let { prime } = req.body;
    let { shipping, payment, subtotal, freight, total } = req.body.order;
    let { phone, email, address, time } = req.body.order.recipient;
    let reqcipient_name = req.body.order.recipient.name;
    
    async.waterfall([
      (next) => {
        if(req.header('Content-Type') !== "application/json") {
          res.json({"error": "Header is not in application/json"});
        } else {
            
            if(!req.headers.authorization){
              let user = null;
              let query = 'INSERT INTO orders SET ?';
              let order_data = { user_id:user, shipping:shipping, payment:payment, subtotal:subtotal,freight:freight, total:total, recipient_phone:phone, recipient_email:email, recipient_address:address, recipient_time:time, recipient_name:reqcipient_name}
              connection.query(query, order_data, (err, result) => {
                console.log('inside section 1-1');
                if(err) return next(err);
                let order_id = result.insertId;
                
                next(null, order_id);
              });
            } else {
              let token = req.headers.authorization.split(' ')[1];
              
              connection.query(`SELECT users.id, authentication_tokens.access_expired FROM authentication_tokens JOIN users ON users.id = authentication_tokens.id WHERE access_token = '${token}'`, (err,result) => {
                if (err) return next(err);
                if(result[0].access_expired - Date.now() <=0){
                  console.log ('expired');
                  return res.redirect('/user/acount_signin');
                } else {
                  let user = result[0].id;
                  let query = 'INSERT INTO orders SET ?';
                  let order_data = { user_id:user, shipping:shipping, payment:payment, subtotal:subtotal,freight:freight, total:total, recipient_phone:phone, recipient_email:email, recipient_address:address, recipient_time:time, recipient_name:reqcipient_name}
                  connection.query(query, order_data, (err, result) => {
                    if(err) return next(err);
                    let order_id = result.insertId;
                    
                    next(null, order_id);
                  });
                }
              });
            }
        }
      },
      (order_id, next) => {
        let values = [];
        for(let i = 0; i < req.body.order.list.length; i++) {
          let { id, price, size, qty } = req.body.order.list[i];
          let list_name = req.body.order.list[i].name;
          let code = req.body.order.list[i].color.code;
          let color_name = req.body.order.list[i].color.name;
          values.push([order_id, id, list_name, price, code, color_name, size, qty]);
        }
        
        let query = 'INSERT INTO list (order_id, product_id, product_name, product_price, product_color_code, product_color_name, product_size, qty) VALUES ?';
        connection.query(query, [values], (err, result2) => {
          
          next(err, order_id);
        }); 
      },
      (order_id, next) => {
        
        const post_data = {
          "prime": prime,
          "partner_key": "#########",
          "merchant_id": "#########",
          "amount": total,
          "currency": "TWD",
          "details": `${order_id} clothing`,
          "cardholder": {
              "phone_number": phone,
              "name": reqcipient_name,
              "email": email
          },
          "remember": false
      }

        const post_options = {
          uri: 'https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime',
          method: 'POST',
          body: post_data,
          json: true,
          headers: {
              'Content-Type': 'application/json',
              'x-api-key': 'partner_PHgswvYEk4QY6oy3n8X3CwiQCVQmv91ZcFoD5VrkGFXo8N7BFiLUxzeG'
          }
        }
        
        request(post_options, (err, response, body) => {
          let data_body = body;
          if(data_body.status !== 0){
            let failed_data = { order_id:order_id, status:data_body.status, msg:data_body.msg }
            connection.query('INSERT INTO payment SET ?', failed_data, (err, result) => {
              if(err) next(err);
              
              return res.json(errMsg);
              // return res.redirect('/order/checkout.html')
            })
          } else {
            let successful_data = { order_id:order_id, status:data_body.status, msg:data_body.msg, amount:data_body.amount, auth_code:data_body.auth_code, currency:data_body.currency, card_info:JSON.stringify(data_body.card_info), bank_transaction_time:JSON.stringify(data_body.bank_transaction_time), card_identifier:data_body.card_identifier}
            connection.query('INSERT INTO payment SET ?', successful_data, (err, result) => {
              if(err) next(err);
              connection.query(`UPDATE orders SET status="paid" WHERE id = ${order_id}`, (err, result) => {
                if (err) next(err);
                res.json({
                  data: {
                    number:order_id
                  }
                })
                next(null, result);
              });
            });
          }  
      })
      }
    ], (err, result) => {
      if(err) return res.json(errMsg);
    });
  }


});

module.exports = router;