var express = require('express');
var exphbs  = require('express-handlebars');
var bparse = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var multer = require('multer');

var app = express();

//Listening port
app.listen(3000);
console.log('Listening at port 3000');

//Handlebars init
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// Body-parser init
app.use(bparse.urlencoded({ extended: false }));
app.use(bparse.json());

// Mongoose database
mongoose.connect('mongodb://127.0.0.1/usersystem');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('LOGGED | MongoDB Connected - ' + new Date());
});

// Models
// User Collection
var UserSchema = mongoose.Schema({
    name: String,
    uname: String,
    pass: String,
    email: String,
    conf: String
});

var User = mongoose.model('users', UserSchema);

// Data Collection
var DataSchema = mongoose.Schema({
	name:String,
	fname:String,
    size:Number
});

var Data = mongoose.model('datas', DataSchema);

// Session
app.use(session({
    secret:"<your_secret_key>",
    resave:true,
    saveUninitialized:false
}));

// Routers
var routerPublic = express.Router();
var routerLoggedin = express.Router();

// Middlewares
routerPublic.use(function (req, res, next) {
    next();
});
routerLoggedin.use(function (req, res, next) {
    if(typeof req.session.user == 'undefined') {
        res.render('login',{msgl:req.query});
    } else {
        next();
    }
});

// Multer
var multipartUpload = multer({storage: multer.diskStorage({
    destination: function (req, file, callback) { callback(null, './uploads');},
    filename: function (req, file, callback) { callback(null, file.originalname);}})
}).single('upfile');

// Routes
// HomePage
routerPublic.get('/', function (req, res) {
    // var x = req.session.user;
    if(req.session.user)
	    res.render('home',{name:req.session.user.name});
    else
        res.render('home');
});

// SignupPage
routerPublic.get('/signup', function (req, res) {
	res.render('signup');
});

// Signup DB Post
routerPublic.post('/signup', function (req, res, next) {
    var newUser = new User({
        name:req.body.name,
        email: req.body.email,
        pass: req.body.password,
        conf: req.body.confirm
    });
    console.log(newUser);
    newUser.save();
    // console.log(userId);
    res.redirect('/login');
});

// Login Page
routerPublic.get('/login', function (req, res) {
    if(req.session.user)
        res.render('login',{loginerr:req.session.user.name});
    else
        res.render('login');
});

// Login validation
routerPublic.post('/login', function(req, res) {
    User.findOne({name : req.body.name},(error, document) => {
        if (error) {
            throw error;
        }
        else {
            if (!document) {
                res.render('login',{msgu:req.query});
                /*res.redirect('/login/?message='+message);*/
            }
            else {
                if (document.pass != req.body.password) {
                    // res.redirect('/login/?message='+encodeURIComponent(message));
                    res.render('login',{msgup:req.query});
                }
                else {
                    req.session.user = document;
                    res.render('login',{msgs:req.query,name:req.session.user.name});
                }
            }
        }
    });
});

// About
routerLoggedin.get('/about', function (req, res) {
    if(req.session.user)
        res.render('about',{name:req.session.user.name});
});

// Upload page
routerLoggedin.get('/upload', function (req, res) {
    if(req.session.user) {
        res.render('upload', {name: req.session.user.name});
    }
    else
        res.render('upload');
});
// Upload file store
routerLoggedin.post('/upload',multipartUpload,function(req,res) {
    var arr = [],sizeinmb;
    var nam = req.session.user.name;
    // sizeinmb=req.file.size/1024000;
    Data.find({name:nam},(error,document) => {
        console.log(document.length);
        if(document.length<=5)
        {
            User.findOne({name: nam},(error, document) => {
                if (error) {
                    throw error;
                }
                else {
                    var x = new Data({
                        name:nam,
                        fname:req.body.upfile.fname
                        // size:sizeinmb
                    });
                    x.save();
                    console.log(x);
                }
            });
            res.redirect('/download');
        }
        else
        {
            var s = "Max file limit crossed!";
            res.render('upload',{max:s,name:nam});
        }
    });  
});

//Download page
routerLoggedin.get('/download', function (req, res) {
        Data.find({name: req.session.user.name}, (error, document) => {
            if (error) {
                throw error;
            }
            else {
            		var arr = [],i;
                    for(i=0;i<document.length;i++){
                    	arr.push(document[i].fname);
                    }
                    res.render('download',{files:arr,name:req.session.user.name});
            }
        });
});
routerLoggedin.post('/download', function (req, res) {
    Data.findOne({name: req.session.user.name,fname: req.body.dload}, (error, document) => {
        if (error) {
            throw error;
        }
        else {
            var path = './uploads/' + document.fname;
            res.download(path);
        }
    });
});


// Logout
routerLoggedin.get('/logout', function (req, res) {
    req.session.destroy(function(err) {
        res.redirect('/login');
    })
});
app.use(routerPublic);
app.use(routerLoggedin);
