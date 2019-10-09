window.fbAsyncInit = function() {
    FB.init({
      appId      : '########',
      cookie     : true,
      xfbml      : true,
      version    : 'v3.3'
    });
    FB.getLoginStatus(function(response) {
      statusChangeCallback(response);
    });
  };
  (function(d, s, id){
  var js, fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) {return;}
  js = d.createElement(s); js.id = id;
  js.src = "https://connect.facebook.net/en_US/sdk.js";
  fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));
  
  function statusChangeCallback(response){
    if(response.status === 'connected') {
      console.log('Logged in and authenticated');
      setElements(true);
      testAPI();
    } else {
      console.log('Not authenticated')
      setElements(false);
    }
  }
  
  function checkLoginState() {
    FB.getLoginStatus(function(response) {
      statusChangeCallback(response);

      const fb_ajax = (src, callback) => { 
      let xhr = new XMLHttpRequest();
      xhr.open("POST", src, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.onreadystatechange = function () {
          if (this.readyState === 4 && this.status === 200) {
          callback(JSON.parse(xhr.response));
          }
      };
        xhr.send(JSON.stringify({
          "provider": "facebook",
          "access_token": response.authResponse.accessToken
        }));
      }

      const fb_signin = (data) => {
        
        localStorage.setItem("token", data.data.access_token);
        localStorage.setItem("expired", data.data.expired_time);
        return document.location.assign('/index.html');
    }

      fb_ajax('/user/signin', function(res) {
        return fb_signin(res);
      });

    });
  }
  
  function testAPI() {
    FB.api('/me?fields=name,email,picture.width(300).height(300)', function(response){
      if(response && !response.error){
        console.log(response)
      }
    });
  }
  
  function setElements(isLoggedIn){
    if(isLoggedIn){
      // document.getElementById('logout').style.display = 'block';
      document.getElementById('fb-btn').style.display = 'none';
    } else {
      document.getElementById('logout').style.display = 'none';
      document.getElementById('fb-btn').style.display = 'block';
    }
  }
  
  function logout(){
    FB.logout(function(response) {
    setElements(false);
    });
  }
  