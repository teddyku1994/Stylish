var defaultCardViewStyle = {
    color: 'rgb(0,0,0)',
    fontSize: '12px',
    lineHeight: '24px',
    fontWeight: '300',
    errorColor: 'red',
    placeholderColor: ''
}
TPDirect.card.setup('#tappay', defaultCardViewStyle, {
    isUsedCcv: true
})
TPDirect.card.onUpdate(function(update) {
var submitButton = document.querySelector('#submit');
var cardViewContainer = document.querySelector('#tappay');
if (update.canGetPrime) {
    submitButton.removeAttribute('disabled');
} else {
    submitButton.setAttribute('disabled', true);
}
})
document.querySelector('#submit').addEventListener('click', function(event) {
    let full_name = document.getElementById("full_name").value;
    let email = document.getElementById("email").value;
    let phone = document.getElementById("phone").value;
    
    if(!full_name) return alert('請輸入姓名');
    if(!email) return alert('請輸入Email');
    if(!phone) return alert('請輸入手機號碼');
    
    TPDirect.card.getPrime(function(result) {
        if(result.status != 0){
            return alert("付款失敗");
        } else {
        
            let purchase = {
                "prime": `${result.card.prime}`,
                "order": {
                    "shipping": "delivery",
                    "payment": "credit_card",
                    "subtotal": parseInt(document.getElementById("product-price").innerHTML.split(".")[1]),
                    "freight": 60,
                    "total": parseInt(document.getElementById("product-price").innerHTML.split(".")[1])+60,
                    "recipient": {
                        "name": full_name,
                        "phone": phone,
                        "email": email,
                        "address": "市政府站",
                        "time": "morning"
                    },
                    "list": [{
                            "id": parseInt(document.getElementById("id").innerHTML),
                            "name": document.getElementById("product-name").innerHTML,
                            "price": parseInt(document.getElementById("product-price").innerHTML.split(".")[1]),
                            "color": {
                                "code": "FFFFFF",
                                "name": "白色"
                            },
                            "size": "M",
                            "qty": 1
                        }
                    ]
                }
            }
        
            let all_purchase = JSON.stringify(purchase);
            let access_token = localStorage.getItem('token');
            
            $.ajax({
                url: "/order/checkout",
                type: "POST",
                beforeSend: function(request) {
                    if(localStorage.getItem('token')){
                        request.setRequestHeader("Authorization", `Bearer ${access_token}`);
                    }
                },
                data: all_purchase,
                contentType: "application/json",
                dataType: "json",
                error: function(data) {
                    if(data.err){
                        return alter("付款失敗");
                    }
                },
                success: function(data) {
                    if(data.error) {
                        return alert("付款失敗");
                    } else {
                    localStorage.setItem('orderNum',data.data.number);
                    window.location = "/thankyou.html" ;
                    } 
                }
            });
        }
    })
})  