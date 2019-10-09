// Search Func
function search() {
    let search_item = document.getElementById('search_item').value
    window.location = `/?tag=${search_item}`
}

// Logout Function
const logout_func = () => {
    let logout = document.getElementById("logout");
    if(localStorage.getItem('token') && localStorage.getItem('expired')){
        logout.style.display =  "unset";
    } 
}


// Ajax Func

const ajax = (src, callback) => { 
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
        callback(JSON.parse(xhr.response));
        }
    }
        xhr.open("GET", src, true);
        xhr.send();
    }


const ajaxBearer = (src, callback) => { 
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
        callback(JSON.parse(xhr.response));
        }
    }
    xhr.open("GET", src);
    xhr.setRequestHeader("Authorization", `Bearer ${localStorage.getItem('token')}`);
    xhr.send();
    }

// Homepage_product Func
const homepage_product = (api) => {
    
    if(!api.data){
        let container = document.getElementById("product-container");
        container.innerHTML = "SORRY, 沒有此商品~";
    } else {
        for(let i = 0; i<api.data.length; i++){
        let main_img = api.data[i].main_image;
        let title = api.data[i].title;
        let price = api.data[i].price;
        let ids = api.data[i].id;
        
        let container = document.getElementById("product-container");

        let product = document.createElement("div");
        product.id = "products";
        container.appendChild(product);

        let link = document.createElement("a");
        link.href = `/product.html?id=${ids}`
        link.className = "product";
        product.appendChild(link);

        let new_img = document.createElement("img");
        new_img.className = "product-img";
        new_img.alt = `Prdouct ${i}`;
        new_img.src = `${main_img}`;
        link.appendChild(new_img);

        let color_div  = document.createElement("div")
        color_div.className = `colors`
        link.appendChild(color_div);

        let new_title = document.createElement("div");
        new_title.className = "name";
        new_title.innerHTML = title;
        link.appendChild(new_title);

        let new_price = document.createElement("div");
        new_price.className = "price"
        new_price.innerHTML = `TWD.${price}`;
        link.appendChild(new_price);
        

            for (let j = 0; j<api.data[i].color.length; j++){
                
                let div_color = document.getElementsByClassName(`colors`)[i]
                let colors = api.data[i].color[j].code;
                let color = document.createElement("div");
                color.className = "color";
                color.style.backgroundColor = `#${colors}`
                div_color.appendChild(color)
            }
        }
    }
    
}

//Campaign Func
const campaign = (api) => {
    for(let i = 0; i<api.data.length; i++){
        let campaign = document.getElementById("campaign")
        let img = api.data[i].picture
        let slogan = api.data[i].story
        let id = api.data[i].id

        campaign.style.backgroundImage = `url(/uploads/${img})` 

        let link = document.createElement("a");
        link.href = `/product.html?id=${id}`
        link.className = "campaign_link";
        campaign.appendChild(link);

        let container = document.createElement("div");
        container.className = "campaign_img"
        link.appendChild(container)
        
        let story  = document.createElement("div");
        story.className = `slogan`;
        story.innerText = slogan;
        container.appendChild(story);
    }
}

//Render Func
const render = () => {
    let product_url = document.URL
    let params = new URL(product_url).searchParams
    let tag = params.get('tag')

     if(!tag || product_url === 'all'){


            let product_api_id_all = `/api/v1/products/all`
            
            ajax(product_api_id_all, function(res) {
                homepage_product(res);
            })

        } else if(tag === 'women') {

            let product_api_id_women = `/api/v1/products/women`

            ajax(product_api_id_women, function(res) {
                homepage_product(res);
            })

        } else if(tag === 'men') {
           
           let product_api_id_men = `/api/v1/products/men`

            ajax(product_api_id_men, function(res) {
                homepage_product(res); 
           })

       } else if(tag === 'accessories') {

           let product_api_id_accessories = `/api/v1/products/accessories`

            ajax(product_api_id_accessories, function(res) {
                homepage_product(res);
           })

       } else{
            let product_api_id_serch = `/api/v1/products/search?keyword=${tag}`

            ajax(product_api_id_serch, function(res) {
                homepage_product(res);
           })
       }  
}

// Product Detail Func
const product_detail = (api) => {
    
    let product_image = document.getElementsByClassName("product-image")[0];
    let product_name = document.getElementsByClassName("product-name")[0];
    let product_id = document.getElementsByClassName("id")[0];
    let product_price = document.getElementsByClassName("product-price")[0];
    let product_colors = document.getElementsByClassName("product-colors")[0];
    let product_size = document.getElementsByClassName("product-size")[0];
    let product_images = document.getElementsByClassName("images")[0];
    
    
    
    let main_img = document.createElement("img");
    main_img.alt = `Main Image`
    main_img.src = `${api.data[0].main_image}`
    product_image.appendChild(main_img)

    product_name.innerHTML = api.data[0].title;
    product_id.innerHTML = api.data[0].id;
    product_price.innerHTML = `TWD.${api.data[0].price}`;
    
    for(let i = 0 ; i < api.data[0].color.length; i++){;
        let colors = api.data[0].color[i].code;
        let color = document.createElement("div");
        color.className = "color-2";
        color.style.backgroundColor = `#${colors}`;
        product_colors.appendChild(color);
    }

    for (let i = 0 ; i < api.data[0].size.length; i++){
        let sizes = api.data[0].size[i];
        let size = document.createElement("div");
        size.className = "size";
        size.innerHTML = sizes;
        product_size.appendChild(size);
    }

    for (let i = 0 ; i < api.data[0].images.length; i++){
        let images = api.data[0].images[i];
        let img = document.createElement("img");
        img.alt = `Product image ${i}`;
        img.src = `${images}`;
        product_images.appendChild(img);
    }

    }

// Profile Fun

const render_profile = (api) => {
    let profile_pic = document.getElementById('profile_pic');
    let user_name = document.getElementById("user_name");
    let user_id = document.getElementById("user_id");
    let user_email = document.getElementById("user_email");
    let user_pic = document.createElement("img");
    user_pic.id = "user_pic";
    
    if(api.data.provider === "native"){
        user_pic.src = `/uploads/${api.data.picture}`;
    } else {
        user_pic.src = `${api.data.picture}`;
    }
    user_pic.alt = "Profile Picture";
    profile_pic.appendChild(user_pic);

    user_name.innerHTML = api.data.name;
    user_id.innerHTML = api.data.id;
    user_email.innerHTML = api.data.email;
    }