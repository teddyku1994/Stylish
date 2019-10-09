const express = require('express');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3')
const multer = require('multer');
const connection = require('../database/dbconnect');
const router = express.Router();
const async = require('async');
const nodeCahe = require('node-cache');
const cache = new nodeCahe({stdTTL: 3600, checkperiod: 0});


router.use(express.json());

AWS.config.update({
  accessKeyId: "KEY ID",
  secretAccessKey: "KEY PW",
  region: "REGION"
});

let s3 = new AWS.S3();

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'stylish-images',
    metadata: function (req, file, cb) {
      cb(null, {fieldName: file.fieldname});
    },
    key: function (req, file, cb) {
      cb(null, `products/${Date.now()+file.originalname}`)
    }
  })
})
.fields([{name: 'main_image', maxCount: 1}, 
{ name: 'images', maxCount:2 }]);

// GET product.html
router.get('/admin/product.html', (req, res) => {
    res.render('product_input');
  });

// Error Message
var errMsg = JSON.parse('{"error" : "Invalid token"}');

/**
 * Product upload  */ 
router.post('/upload', upload, (req, res) => {
  let { id, title, description, price, texture, wash, place, note, story, name, color_code, size, stock, gender, accessories } = req.body;
  let { main_image, images } = req.files;

  let product_data = { id:id, title:title, description:description, price:price, texture:texture, wash:wash, place:place, note:note, story:story, main_image:main_image[0].location, gender:gender.toUpperCase(), accessories:accessories.toUpperCase()};

  connection.query('INSERT INTO products SET ?', product_data, (err, result) => {
    if (err) return res.send(errMsg);
    // cache.del(result.InsertId, (err, value) => {
    //   if (err) throw err;
    // })
  });

  // Variants Array
  if (typeof color_code === "string") {
    let variants_elements = { id:id, color_code:color_code.toUpperCase(), size:size.toUpperCase(), stock:stock, name:name.toUpperCase(), gender:gender.toUpperCase(), accessories:accessories.toUpperCase()}
      connection.query('INSERT INTO variants SET?', variants_elements, (err, result) => { 
        if (err) return res.send(errMsg);
      })
  } else {
    for(let i = 0; i<color_code.length; i++) {
      let variants_elements = { id:id, color_code:color_code[i].toUpperCase(), size:size[i].toUpperCase(), stock:stock[i], name:name[i].toUpperCase(), gender:gender.toUpperCase(), accessories:accessories.toUpperCase()}
      connection.query('INSERT INTO variants SET?', variants_elements, (err, result) => {
        if (err) return res.send(errMsg);
      })
    }
  }
  
  
  // Images
  for (let i = 0; i<images.length; i++){
    let elements = { id:id, images:images[i].location, gender:gender.toUpperCase(), accessories:accessories.toUpperCase() }
    connection.query('INSERT INTO images SET?', elements, (err,result) => {
      console.log('hi')
      if (err) return res.send(errMsg);
    })
  }

  return res.render('submit');

});

/**
 * *************
 *  Product API
 * *************
 *  */

// All API
router.get('/api/v1/products/all', (req, res) => { 

  let page = parseInt(req.query.paging);
  const api_count_perpage = 6;
  
  if(isNaN(page)){
    page = 0;
  } else {
    page = parseInt(req.query.paging);
  }
  
  const offset_value = ((page)*api_count_perpage);

  async.waterfall([
    (next) => {
      
      let user_id_arr = [];
      connection.query(`SELECT * FROM products LIMIT ${api_count_perpage} OFFSET ${offset_value}`, (err1, result1) => {
        for(let i = 0; i< result1.length; i++){
          user_id_arr.push(result1[i].id);
        }
        let user_id_string = user_id_arr.join(',')
        next(err1, result1, user_id_string);
      });

    },
    (result1, user_id_string, next) => {
      
      connection.query(`SELECT * FROM variants WHERE id in (${user_id_string})`, (err2, result2) => {
        let variants_arr = [];
        let colors_arr = [];
        let sizes_arr = [];
        
        for(let i = 0; i < result2.length; i++){
          variants_arr.push({color_code:result2[i].color_code ,size:result2[i].size ,stock:result2[i].stock});
          colors_arr.push({code:result2[i].color_code, name:result2[i].name});
          sizes_arr.push(result2[i].size);
        }

        let variant_arr_id = [];
        let colors_arr_id =[];
        let sizes_arr_id = [];
        let count = 0;
        variant_arr_id[count] = [];
        colors_arr_id[count] = [];
        sizes_arr_id[count] = [];


        for(let i=0; i<result2.length; i++) {
          if (i === 0 || result2[i].id === result2[i-1].id) {
            variant_arr_id[count].push(variants_arr[i]);
            colors_arr_id[count].push(colors_arr[i]);
            sizes_arr_id[count].push(sizes_arr[i])
            
          } else {
            count++;
            variant_arr_id[count] = [];
            colors_arr_id[count] = [];
            sizes_arr_id[count] = [];
            variant_arr_id[count].push(variants_arr[i]);
            colors_arr_id[count].push(colors_arr[i]);
            sizes_arr_id[count].push(sizes_arr[i]);
            
          }
        }
    
        let sizes_arr_id_new = [];
        for (let i = 0; i<sizes_arr_id.length; i++){
          sizes_arr_id_new.push([...new Set(sizes_arr_id[i])]);
        }

        function getUnique(arr, comp) {
            const unique = arr
              .map(e => e[comp])
            .map((e, i, final) => final.indexOf(e) === i && i)
            .filter(e => arr[e]).map(e => arr[e]);
          return unique;
          }    
        
        let colors_arr_id_new = [];
        for(let i = 0; i<colors_arr_id.length; i++){
          colors_arr_id_new.push(getUnique(colors_arr_id[i], 'code'));
        }

        next(err2, result1, user_id_string, sizes_arr_id_new, colors_arr_id_new, variant_arr_id);
      });
    },
    (result1, user_id_string, sizes_arr_id_new, colors_arr_id_new, variant_arr_id, next) => {
      
      connection.query(`SELECT * FROM images WHERE id in (${user_id_string})`, (err3, result3) => {
        let images_arr = [];
        for(let i = 0; i < result3.length; i++){
          images_arr.push(result3[i].images);
        }
  
        let images_arr_id = [];
        let count = 0;
        images_arr_id[count] = [];
        
        for(let i=0; i<result3.length; i++) {
          if (i === 0 || result3[i].id === result3[i-1].id) {
            images_arr_id[count].push(images_arr[i]);
            
          } else {
            count++;
            images_arr_id[count] = [];
            images_arr_id[count].push(images_arr[i]);          
          }
        }
        next(err3, result1, sizes_arr_id_new, colors_arr_id_new, variant_arr_id, images_arr_id);
      });
    },
    (result1, sizes_arr_id_new, colors_arr_id_new, variant_arr_id, images_arr_id, next) => {
      
      connection.query('SELECT COUNT(id) FROM products', (err4, result4) => {
          
        let products_arr = [];
        let prodcuts_obj = {};

        for(let i = 0; i < result1.length; i++){
          products_arr.push({id: result1[i].id, title: result1[i].title, description: result1[i].description, price: result1[i].price, texture: result1[i].texture, wash: result1[i].wash, place: result1[i].place, note: result1[i].note, story: result1[i].story, size: sizes_arr_id_new[i], color: colors_arr_id_new[i], variants: variant_arr_id[i], main_image: result1[i].main_image, images: images_arr_id[i]});
        }

        prodcuts_obj['data'] = products_arr;

        let limit_value = (page+1)*api_count_perpage;

        if (result4[0]["COUNT(id)"] - limit_value <= 0){
          console.log('no more page')
        } else {
          prodcuts_obj['paging'] = page+1
        }
        
        if (prodcuts_obj.data.length == 0){
          return res.json(errMsg);
        } else {
          res.json(prodcuts_obj);
        }
        next(err4, prodcuts_obj);
      });
    }
  ], (err, rst) => {
    if(err) return err;
  });

});

// Women API
router.get('/api/v1/products/women', (req, res) => {
  
  let page = parseInt(req.query.paging);
  const api_count_perpage = 6;
  
  if(isNaN(page)){
    page = 0;
  } else {
    page = parseInt(req.query.paging);
  }
  
  const offset_value = ((page)*api_count_perpage);

  async.waterfall([
    (next) => {
      
      let user_id_arr = []
      connection.query(`SELECT * FROM products WHERE gender = 'F' LIMIT ${api_count_perpage} OFFSET ${offset_value}`, (err1, result1) => {
        for(let i = 0; i< result1.length; i++){
          user_id_arr.push(result1[i].id);
        }
        let user_id_string = user_id_arr.join(',')
        next(err1, result1, user_id_string);
      });

    },
    (result1, user_id_string, next) => {
      
      connection.query(`SELECT * FROM variants WHERE id in (${user_id_string})`, (err2, result2) => {
        let variants_arr = [];
        let colors_arr = [];
        let sizes_arr = [];
        
        for(let i = 0; i < result2.length; i++){
          variants_arr.push({color_code:result2[i].color_code ,size:result2[i].size ,stock:result2[i].stock});
          colors_arr.push({code:result2[i].color_code, name:result2[i].name});
          sizes_arr.push(result2[i].size);
        }

        let variant_arr_id = [];
        let colors_arr_id =[];
        let sizes_arr_id = [];
        let count = 0;
        variant_arr_id[count] = [];
        colors_arr_id[count] = [];
        sizes_arr_id[count] = [];


        for(let i=0; i<result2.length; i++) {
          if (i === 0 || result2[i].id === result2[i-1].id) {
            variant_arr_id[count].push(variants_arr[i]);
            colors_arr_id[count].push(colors_arr[i]);
            sizes_arr_id[count].push(sizes_arr[i]);
            
          } else {
            count++;
            variant_arr_id[count] = [];
            colors_arr_id[count] = [];
            sizes_arr_id[count] = [];
            variant_arr_id[count].push(variants_arr[i]);
            colors_arr_id[count].push(colors_arr[i]);
            sizes_arr_id[count].push(sizes_arr[i]);
            
          }
        }
        
        
        let sizes_arr_id_new = []
        for (let i = 0; i<sizes_arr_id.length; i++){
          sizes_arr_id_new.push([...new Set(sizes_arr_id[i])])
        }

        function getUnique(arr, comp) {
            const unique = arr
              .map(e => e[comp])
            .map((e, i, final) => final.indexOf(e) === i && i)
            .filter(e => arr[e]).map(e => arr[e]);
          return unique;
          }    
        
        let colors_arr_id_new = [];
        for(let i = 0; i<colors_arr_id.length; i++){
          colors_arr_id_new.push(getUnique(colors_arr_id[i], 'code'));
        }

        next(err2, result1, user_id_string, sizes_arr_id_new, colors_arr_id_new, variant_arr_id);
      });
    },
    (result1, user_id_string, sizes_arr_id_new, colors_arr_id_new, variant_arr_id, next) => {
      
      connection.query(`SELECT * FROM images WHERE id in (${user_id_string})`, (err3, result3) => {
        let images_arr = [];
        for(let i = 0; i < result3.length; i++){
          images_arr.push(result3[i].images);
        }
  
        let images_arr_id = [];
        let count = 0;
        images_arr_id[count] = [];
        
        for(let i=0; i<result3.length; i++) {
          if (i === 0 || result3[i].id === result3[i-1].id) {
            images_arr_id[count].push(images_arr[i]);
            
          } else {
            count++;
            images_arr_id[count] = [];
            images_arr_id[count].push(images_arr[i]);          
          }
        }
        next(err3, result1, sizes_arr_id_new, colors_arr_id_new, variant_arr_id, images_arr_id);
      });
    },
    (result1, sizes_arr_id_new, colors_arr_id_new, variant_arr_id, images_arr_id, next) => {
      
      connection.query(`SELECT COUNT(id) FROM products WHERE gender = 'F'`, (err4, result4) => {
          
        let products_arr = [];
        let prodcuts_obj = {};

        for(let i = 0; i < result1.length; i++){
          products_arr.push({id: result1[i].id, title: result1[i].title, description: result1[i].description, price: result1[i].price, texture: result1[i].texture, wash: result1[i].wash, place: result1[i].place, note: result1[i].note, story: result1[i].story, size: sizes_arr_id_new[i], color: colors_arr_id_new[i], variants: variant_arr_id[i], main_image: result1[i].main_image, images: images_arr_id[i]});
        }

        prodcuts_obj['data'] = products_arr;

        let limit_value = (page+1)*api_count_perpage;

        if (result4[0]["COUNT(id)"] - limit_value <= 0){
          console.log('no more page');
        } else {
          prodcuts_obj['paging'] = page+1;
        }
        
        if (prodcuts_obj.data.length == 0){
          return res.json(errMsg);
        } else {
          res.json(prodcuts_obj);
        }
        next(err4, prodcuts_obj);
      });
    }
  ], (err, rst) => {
    if(err) return err;
  });

})

// Men API
router.get('/api/v1/products/men', (req, res) => {
  
  let page = parseInt(req.query.paging);
  const api_count_perpage = 6;
  
  if(isNaN(page)){
    page = 0;
  } else {
    page = parseInt(req.query.paging);
  }
  
  const offset_value = ((page)*api_count_perpage);

  async.waterfall([
    (next) => {
      
      let user_id_arr = []
      connection.query(`SELECT * FROM products WHERE gender = 'M' LIMIT ${api_count_perpage} OFFSET ${offset_value}`, (err1, result1) => {
        for(let i = 0; i< result1.length; i++){
          user_id_arr.push(result1[i].id);
        }
        let user_id_string = user_id_arr.join(',');
        next(err1, result1, user_id_string);
      });

    },
    (result1, user_id_string, next) => {
      
      connection.query(`SELECT * FROM variants WHERE id in (${user_id_string})`, (err2, result2) => {
        let variants_arr = [];
        let colors_arr = [];
        let sizes_arr = [];
        
        for(let i = 0; i < result2.length; i++){
          variants_arr.push({color_code:result2[i].color_code ,size:result2[i].size ,stock:result2[i].stock});
          colors_arr.push({code:result2[i].color_code, name:result2[i].name});
          sizes_arr.push(result2[i].size);
        }

        let variant_arr_id = [];
        let colors_arr_id =[];
        let sizes_arr_id = [];
        let count = 0;
        variant_arr_id[count] = [];
        colors_arr_id[count] = [];
        sizes_arr_id[count] = [];


        for(let i=0; i<result2.length; i++) {
          if (i === 0 || result2[i].id === result2[i-1].id) {
            variant_arr_id[count].push(variants_arr[i]);
            colors_arr_id[count].push(colors_arr[i]);
            sizes_arr_id[count].push(sizes_arr[i]);
            
          } else {
            count++;
            variant_arr_id[count] = [];
            colors_arr_id[count] = [];
            sizes_arr_id[count] = [];
            variant_arr_id[count].push(variants_arr[i]);
            colors_arr_id[count].push(colors_arr[i]);
            sizes_arr_id[count].push(sizes_arr[i]);
            
          }
        }
        
        
        let sizes_arr_id_new = []
        for (let i = 0; i<sizes_arr_id.length; i++){
          sizes_arr_id_new.push([...new Set(sizes_arr_id[i])]);
        }

        function getUnique(arr, comp) {
            const unique = arr
              .map(e => e[comp])
            .map((e, i, final) => final.indexOf(e) === i && i)
            .filter(e => arr[e]).map(e => arr[e]);
          return unique;
          }    
        
        let colors_arr_id_new = [];
        for(let i = 0; i<colors_arr_id.length; i++){
          colors_arr_id_new.push(getUnique(colors_arr_id[i], 'code'));
        }

        next(err2, result1, user_id_string, sizes_arr_id_new, colors_arr_id_new, variant_arr_id);
      });
    },
    (result1, user_id_string, sizes_arr_id_new, colors_arr_id_new, variant_arr_id, next) => {
      
      connection.query(`SELECT * FROM images WHERE id in (${user_id_string})`, (err3, result3) => {
        let images_arr = [];
        for(let i = 0; i < result3.length; i++){
          images_arr.push(result3[i].images);
        }
  
        let images_arr_id = [];
        let count = 0;
        images_arr_id[count] = [];
        
        for(let i=0; i<result3.length; i++) {
          if (i === 0 || result3[i].id === result3[i-1].id) {
            images_arr_id[count].push(images_arr[i]);
            
          } else {
            count++;
            images_arr_id[count] = [];
            images_arr_id[count].push(images_arr[i]);          
          }
        }
        next(err3, result1, sizes_arr_id_new, colors_arr_id_new, variant_arr_id, images_arr_id);
      });
    },
    (result1, sizes_arr_id_new, colors_arr_id_new, variant_arr_id, images_arr_id, next) => {
      
      connection.query(`SELECT COUNT(id) FROM products WHERE gender = 'M'`, (err4, result4) => {
          
        let products_arr = [];
        let prodcuts_obj = {};

        for(let i = 0; i < result1.length; i++){
          products_arr.push({id: result1[i].id, title: result1[i].title, description: result1[i].description, price: result1[i].price, texture: result1[i].texture, wash: result1[i].wash, place: result1[i].place, note: result1[i].note, story: result1[i].story, size: sizes_arr_id_new[i], color: colors_arr_id_new[i], variants: variant_arr_id[i], main_image: result1[i].main_image, images: images_arr_id[i]});
        }

        prodcuts_obj['data'] = products_arr;

        let limit_value = (page+1)*api_count_perpage;

        if (result4[0]["COUNT(id)"] - limit_value <= 0){
          console.log('no more page');
        } else {
          prodcuts_obj['paging'] = page+1;
        }
        
        if (prodcuts_obj.data.length == 0){
          return res.json(errMsg);
        } else {
          res.json(prodcuts_obj);
        }
        next(err4, prodcuts_obj);
      });
    }
  ], (err, rst) => {
    if(err) return err;
  });

})

// Accessories API
router.get('/api/v1/products/accessories', (req, res) => {
  
  let page = parseInt(req.query.paging);
  const api_count_perpage = 6;
  
  if(isNaN(page)){
    page = 0;
  } else {
    page = parseInt(req.query.paging);
  }
  
  const offset_value = ((page)*api_count_perpage);

  async.waterfall([
    (next) => {
      
      let user_id_arr = [];
      connection.query(`SELECT * FROM products WHERE accessories = 'Y' LIMIT ${api_count_perpage} OFFSET ${offset_value}`, (err1, result1) => {
        for(let i = 0; i< result1.length; i++){
          user_id_arr.push(result1[i].id);
        }
        let user_id_string = user_id_arr.join(',')
        next(err1, result1, user_id_string);
      });

    },
    (result1, user_id_string, next) => {
      
      connection.query(`SELECT * FROM variants WHERE id in (${user_id_string})`, (err2, result2) => {
        let variants_arr = [];
        let colors_arr = [];
        let sizes_arr = [];
        
        for(let i = 0; i < result2.length; i++){
          variants_arr.push({color_code:result2[i].color_code ,size:result2[i].size ,stock:result2[i].stock});
          colors_arr.push({code:result2[i].color_code, name:result2[i].name});
          sizes_arr.push(result2[i].size);
        }

        let variant_arr_id = [];
        let colors_arr_id =[];
        let sizes_arr_id = [];
        let count = 0;
        variant_arr_id[count] = [];
        colors_arr_id[count] = [];
        sizes_arr_id[count] = [];


        for(let i=0; i<result2.length; i++) {
          if (i === 0 || result2[i].id === result2[i-1].id) {
            variant_arr_id[count].push(variants_arr[i]);
            colors_arr_id[count].push(colors_arr[i]);
            sizes_arr_id[count].push(sizes_arr[i])
            
          } else {
            count++;
            variant_arr_id[count] = [];
            colors_arr_id[count] = [];
            sizes_arr_id[count] = [];
            variant_arr_id[count].push(variants_arr[i]);
            colors_arr_id[count].push(colors_arr[i]);
            sizes_arr_id[count].push(sizes_arr[i])
            
          }
        }
        
        
        let sizes_arr_id_new = [];
        for (let i = 0; i<sizes_arr_id.length; i++){
          sizes_arr_id_new.push([...new Set(sizes_arr_id[i])]);
        }

        function getUnique(arr, comp) {
            const unique = arr
              .map(e => e[comp])
            .map((e, i, final) => final.indexOf(e) === i && i)
            .filter(e => arr[e]).map(e => arr[e]);
          return unique;
          }    
        
        let colors_arr_id_new = [];
        for(let i = 0; i<colors_arr_id.length; i++){
          colors_arr_id_new.push(getUnique(colors_arr_id[i], 'code'));
        }

        next(err2, result1, user_id_string, sizes_arr_id_new, colors_arr_id_new, variant_arr_id);
      });
    },
    (result1, user_id_string, sizes_arr_id_new, colors_arr_id_new, variant_arr_id, next) => {
      
      connection.query(`SELECT * FROM images WHERE id in (${user_id_string})`, (err3, result3) => {
        let images_arr = [];
        for(let i = 0; i < result3.length; i++){
          images_arr.push(result3[i].images);
        }
  
        let images_arr_id = [];
        let count = 0;
        images_arr_id[count] = [];
        
        for(let i=0; i<result3.length; i++) {
          if (i === 0 || result3[i].id === result3[i-1].id) {
            images_arr_id[count].push(images_arr[i]);
            
          } else {
            count++;
            images_arr_id[count] = [];
            images_arr_id[count].push(images_arr[i]);          
          }
        }
        next(err3, result1, sizes_arr_id_new, colors_arr_id_new, variant_arr_id, images_arr_id);
      });
    },
    (result1, sizes_arr_id_new, colors_arr_id_new, variant_arr_id, images_arr_id, next) => {
      
      connection.query(`SELECT COUNT(id) FROM products WHERE accessories = 'Y'`, (err4, result4) => {
          
        let products_arr = [];
        let prodcuts_obj = {};

        for(let i = 0; i < result1.length; i++){
          products_arr.push({id: result1[i].id, title: result1[i].title, description: result1[i].description, price: result1[i].price, texture: result1[i].texture, wash: result1[i].wash, place: result1[i].place, note: result1[i].note, story: result1[i].story, size: sizes_arr_id_new[i], color: colors_arr_id_new[i], variants: variant_arr_id[i], main_image: result1[i].main_image, images: images_arr_id[i]});
        }

        prodcuts_obj['data'] = products_arr;

        let limit_value = (page+1)*api_count_perpage;

        if (result4[0]["COUNT(id)"] - limit_value <= 0){
          console.log('no more page');
        } else {
          prodcuts_obj['paging'] = page+1;
        }
        
        if (prodcuts_obj.data.length == 0){
          return res.json(errMsg);
        } else {
          res.json(prodcuts_obj);
        }
        next(err4, prodcuts_obj);
      });
    }
  ], (err, rst) => {
    if(err) return err;
  });

})


router.get('/api/v1/products/search', (req, res) => {
  
  let errMsg = JSON.parse('{"error" : "Invalid token"}')
  let keyword_query = req.query.keyword;
  
  if (keyword_query == undefined){
    return res.json(errMsg);
  } else {
    keyword_query = req.query.keyword;
    
  let page = parseInt(req.query.paging);
  const api_count_perpage = 6;
  
  if(isNaN(page)){
    page = 0;
  } else {
    page = parseInt(req.query.paging);
  }
  
  const offset_value = ((page)*api_count_perpage);

  async.waterfall([
    (next) => {
      
      let user_id_arr = []
      connection.query(`SELECT * FROM products WHERE title LIKE '%${keyword_query}%' LIMIT ${api_count_perpage} OFFSET ${offset_value}`, (err1, result1) => {
        if(result1.length === 0){
          return res.json(errMsg);
        }
        for(let i = 0; i< result1.length; i++){
          user_id_arr.push(result1[i].id);
        }
        let user_id_string = user_id_arr.join(',')
        next(err1, result1, user_id_string);
      });

    },
    (result1, user_id_string, next) => {
      
      connection.query(`SELECT * FROM variants WHERE id in (${user_id_string})`, (err2, result2) => {
        let variants_arr = [];
        let colors_arr = [];
        let sizes_arr = [];
        
        for(let i = 0; i < result2.length; i++){
          variants_arr.push({color_code:result2[i].color_code ,size:result2[i].size ,stock:result2[i].stock});
          colors_arr.push({code:result2[i].color_code, name:result2[i].name});
          sizes_arr.push(result2[i].size);
        }

        let variant_arr_id = [];
        let colors_arr_id =[];
        let sizes_arr_id = [];
        let count = 0;
        variant_arr_id[count] = [];
        colors_arr_id[count] = [];
        sizes_arr_id[count] = [];


        for(let i=0; i<result2.length; i++) {
          if (i === 0 || result2[i].id === result2[i-1].id) {
            variant_arr_id[count].push(variants_arr[i]);
            colors_arr_id[count].push(colors_arr[i]);
            sizes_arr_id[count].push(sizes_arr[i]);
            
          } else {
            count++;
            variant_arr_id[count] = [];
            colors_arr_id[count] = [];
            sizes_arr_id[count] = [];
            variant_arr_id[count].push(variants_arr[i]);
            colors_arr_id[count].push(colors_arr[i]);
            sizes_arr_id[count].push(sizes_arr[i]);
            
          }
        }
        
        
        let sizes_arr_id_new = [];
        for (let i = 0; i<sizes_arr_id.length; i++){
          sizes_arr_id_new.push([...new Set(sizes_arr_id[i])]);
        }

        function getUnique(arr, comp) {
            const unique = arr
              .map(e => e[comp])
            .map((e, i, final) => final.indexOf(e) === i && i)
            .filter(e => arr[e]).map(e => arr[e]);
          return unique;
          }    
        
        let colors_arr_id_new = [];
        for(let i = 0; i<colors_arr_id.length; i++){
          colors_arr_id_new.push(getUnique(colors_arr_id[i], 'code'));
        }

        next(err2, result1, user_id_string, sizes_arr_id_new, colors_arr_id_new, variant_arr_id);
      });
    },
    (result1, user_id_string, sizes_arr_id_new, colors_arr_id_new, variant_arr_id, next) => {
      
      connection.query(`SELECT * FROM images WHERE id in (${user_id_string})`, (err3, result3) => {
        let images_arr = [];
        for(let i = 0; i < result3.length; i++){
          images_arr.push(result3[i].images);
        }
  
        let images_arr_id = [];
        let count = 0;
        images_arr_id[count] = [];
        
        for(let i=0; i<result3.length; i++) {
          if (i === 0 || result3[i].id === result3[i-1].id) {
            images_arr_id[count].push(images_arr[i]);
            
          } else {
            count++;
            images_arr_id[count] = [];
            images_arr_id[count].push(images_arr[i]);          
          }
        }
        next(err3, result1, sizes_arr_id_new, colors_arr_id_new, variant_arr_id, images_arr_id);
      });
    },
    (result1, sizes_arr_id_new, colors_arr_id_new, variant_arr_id, images_arr_id, next) => {
      
      connection.query(`SELECT COUNT(id) FROM products WHERE title LIKE '%${keyword_query}%'`, (err4, result4) => {
          
        let products_arr = [];
        let prodcuts_obj = {};

        for(let i = 0; i < result1.length; i++){
          products_arr.push({id: result1[i].id, title: result1[i].title, description: result1[i].description, price: result1[i].price, texture: result1[i].texture, wash: result1[i].wash, place: result1[i].place, note: result1[i].note, story: result1[i].story, size: sizes_arr_id_new[i], color: colors_arr_id_new[i], variants: variant_arr_id[i], main_image: result1[i].main_image, images: images_arr_id[i]});
        }

        prodcuts_obj['data'] = products_arr;

        let limit_value = (page+1)*api_count_perpage;

        if (result4[0]["COUNT(id)"] - limit_value <= 0){
          console.log('no more page');
        } else {
          prodcuts_obj['paging'] = page+1;
        }
        
        if (prodcuts_obj.data.length == 0){
          return res.json(errMsg);
        } else {
          res.json(prodcuts_obj);
        }
        next(err4, prodcuts_obj);
      });
    }
  ], (err, rst) => {
    if(err) return err;
  });
  }
})


router.get('/api/v1/products/detail', (req, res) => {
  

  let errMsg = JSON.parse('{"error" : "Invalid token"}');
  

  cache.get(req.query.id, (err, value) => {

    if (!err){
      if (value == undefined){
        let id_query = parseInt(req.query.id);
        connection.query(`SELECT * from variants WHERE id = ?`, id_query, (err, result) => {
          if(err) return res.json(errMsg);
          let variants_arr = [];
          let colors_arr = [];
          let sizes_arr = [];
          
          for(let i = 0; i < result.length; i++){
            variants_arr.push({color_code:result[i].color_code ,size:result[i].size ,stock:result[i].stock});
            colors_arr.push({code:result[i].color_code, name:result[i].name});
            sizes_arr.push(result[i].size);
          }
      
          let variant_arr_id = [];
          let colors_arr_id =[];
          let sizes_arr_id = [];
          let count = 0;
          variant_arr_id[count] = [];
          colors_arr_id[count] = [];
          sizes_arr_id[count] = [];
      
      
          for(let i=0; i<result.length; i++) {
            if (i === 0 || result[i].id === result [i-1].id) {
              variant_arr_id[count].push(variants_arr[i]);
              colors_arr_id[count].push(colors_arr[i]);
              sizes_arr_id[count].push(sizes_arr[i]);
              
            } else {
              count++;
              variant_arr_id[count] = [];
              colors_arr_id[count] = [];
              sizes_arr_id[count] = [];
              variant_arr_id[count].push(variants_arr[i]);
              colors_arr_id[count].push(colors_arr[i]);
              sizes_arr_id[count].push(sizes_arr[i]);
              
            }
          }
          
          let sizes_arr_id_new = [];
          for (let i = 0; i<sizes_arr_id.length; i++){
            sizes_arr_id_new.push([...new Set(sizes_arr_id[i])]);
          }
      
          function getUnique(arr, comp) {
            const unique = arr
              .map(e => e[comp])
              .map((e, i, final) => final.indexOf(e) === i && i)
              .filter(e => arr[e]).map(e => arr[e]);
           return unique;
          }    
        
          let colors_arr_id_new = [];
          for(let i = 0; i<colors_arr_id.length; i++){
            colors_arr_id_new.push(getUnique(colors_arr_id[i], 'code'));
          }
      
          connection.query(`SELECT * FROM images WHERE id =?`, id_query, (err, result) => {
            if(err) return res.json(errMsg);
            let images_arr = [];
            for(let i = 0; i < result.length; i++){
              images_arr.push(result[i].images);
            }
      
            let images_arr_id = [];
            let count = 0;
            images_arr_id[count] = [];
            
            for(let i=0; i<result.length; i++) {
              if (i === 0 || result[i].id === result [i-1].id) {
                images_arr_id[count].push(images_arr[i]);
                
              } else {
                count++;
                images_arr_id[count] = [];
                images_arr_id[count].push(images_arr[i]);          
              }
            }
      
            connection.query(`SELECT * FROM products WHERE id =?`, id_query, (err, result) => {
              if(err) return res.json(errMsg);
        
              let products_arr = [];
        
              for(let i = 0; i < result.length; i++){
              products_arr.push({id: result[i].id, title: result[i].title, description: result[i].description, price: result[i].price, texture: result[i].texture, wash: result[i].wash, place: result[i].place, note: result[i].note, story: result[i].story, size: sizes_arr_id_new[i], color: colors_arr_id_new[i], variants: variant_arr_id[i], main_image: result[i].main_image, images: images_arr_id[i]});
            }
              
              let prodcuts_obj = {};
              prodcuts_obj['data'] = products_arr;
              if(prodcuts_obj.data.length === 0){
                return res.json(errMsg);
              }
              cache.set(req.query.id, prodcuts_obj, (err,value) => {
                if( !err && value ){
                  console.log('ok')
                }
                return res.json(prodcuts_obj)
              })
            });
      
          });
          
        });
      } else {
        res.json(value)
      }
    } else {
      res.json(errMsg)
    }
  })

  

});


module.exports = router;