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
  .fields([{name: 'main_image', maxCount: 1}, { name: 'images', maxCount:2 }])
  
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