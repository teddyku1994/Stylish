const express = require('express');
const multer = require('multer');
const connection = require('../database/dbconnect');
const router = express.Router();
const path = require('path');
const func = require('./func_module');
const nodeCahe = require('node-cache');
const cache = new nodeCahe({stdTTL: 3600, checkperiod: 0});

router.use(express.json());

// Set Storage Engine
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function(req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
  });
  
// Init Upload Multer
const upload = multer({
  storage : storage,
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
})
.fields([{name: 'picture', maxCount: 20}]);

//Check File Type
function checkFileType(file, cb){
  // Check file Type
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if(mimetype && extname){
    return cb(null, true);
  } else {
    cb('Error: Images Only');
  }
}

router.get('/admin/campaign.html', (req, res) => {
    res.render('campaign_input');
});

router.post('/upload_campaign', upload, (req, res) => {
    
    let { id, story } = req.body;
    let { picture } = req.files;
    
    if (typeof story === "string") {
        let campaign_elements = { id:id, story:story, picture:picture[0].filename}
          connection.query('INSERT INTO campaign SET ?', campaign_elements, (err, result) => { 
            if (err) res.send(err);
            
            cache.del("campaigns_result", (err, value) => {
              if (err) throw err;
            })
          })

      } else {

        for(let i = 0; i<story.length; i++) {
          let campaign_elements = { id:id[i], story:story[i], picture:picture[i].filename }
          connection.query('INSERT INTO campaign SET ?', campaign_elements, (err, result) => {
            if (err) res.send(err);
            
            cache.del("campaigns_result", (err, value) => {
              if (err) throw err;
            })
          })
        }
      }

      res.render('submit');
});



router.get('/api/v1/marketing/campaigns', async(req,res,next) => {

  const error = (err) => {
    res.json(err)
  }

  let sql = 'SELECT * FROM campaign';
  let result = await func.sqlQuery(sql, error) ;
  
  cache.get( "campaigns_result", ( err, value ) => {
    if(!err){
      if(value === undefined){
        let campaign_arr = []
        for(let i = 0; i<result.length; i++){
          campaign_arr.push({id:result[i].id, picture:result[i].picture, story:result[i].story})
        }
        let data = {data:campaign_arr}
        cache.set("campaigns_result", data, (err, value) => {
          if( !err && value ){
            res.json(data);
          }
        });
      } else {
        res.json(value);
      }
    }
  });
 });

module.exports = router;