var express = require('express');
var exphbs  = require('express-handlebars');
var bparse = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var multer = require('multer');
var mysql = require('mysql');

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

// MySQL
var connection = mysql.createConnection({ 
    host : 'localhost', 
    user : 'root', 
    password : '', 
    database : 'clouddb' 
}); 
connection.connect(function(err){ 
    if(!err) { 
        console.log("Mysql Database is connected ... "); 
    } 
    else { 
        console.log("Error connecting database ... "); 
    } 
});

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
    connection.query('select * from user',function(err,row,feild){
        console.log(row);
    });
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
    var newUser = {
        name:req.body.name,
        email: req.body.email,
        pass: req.body.password,
        conf: req.body.confirm
    };
    console.log(newUser);
    connection.query('insert into user set ?',newUser);
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
    connection.query('select * from user where email = ?',req.body.email,(error, document) => {
        if (error) {
            throw error;
        }
        else {
            if (!document[0]) {
                res.render('home',{msgu:req.query});
                /*res.redirect('/login/?message='+message);*/
            }
            else {
                if (document[0].pass != req.body.password) {
                    // res.redirect('/login/?message='+encodeURIComponent(message));
                    res.render('home',{msgup:req.query});
                }
                else {
                    req.session.user = document[0];
                    res.render('home',{msgs:req.query,name:req.session.user.name});
                }
            }
        }
    });
});

// Allfiles
routerLoggedin.get('/allfiles', function (req, res) {
    var arr = [];
    if(req.session.user){
        connection.query('select * from data',(error,document) => {
            for(i=0;i<document.length;i++){
                arr.push({name:document[i].name,fname:document[i].fname,size:document[i].size/1024,type:document[i].type});
            }
        });
        res.render('allfiles',{name:req.session.user.name,files:arr});
    }
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
    sizeinmb = req.file.size;
    // sizeinmb=req.file.size/1024000;
    connection.query('select * from data where name = ? group by name having count(fname)<5',req.session.user.name,(error,document) => {
        if (error) {
            res.render('upload',{max:error});
        }
        else {
            var x = {
                name:nam,
                fname:req.file.originalname,
                size:sizeinmb,
                type:req.file.mimetype
            };
            connection.query('insert into data set ?',x);
            console.log(x);
            res.redirect('/download');
        }
    });

});

//Download page
routerLoggedin.get('/download', function (req, res) {
        connection.query('select * from data where name = ?',req.session.user.name, (error, document) => {
            console.log(document);
            if (error) {
                throw error;
            }
            else {
            		var arr = [],i;
                    for(i=0;i<document.length;i++){
                    	arr.push({name:document[i].fname,size:document[i].size/1000});
                    }
                    console.log(arr);
                    res.render('download',{files:arr,name:req.session.user.name});
            }
        });
});
routerLoggedin.post('/download', function (req, res) {
    connection.query('select * from data where name = ? and fname = ?',[req.session.user.name,req.body.dload], (error, document) => {
        if (error) {
            throw error;
        }
        else {
            var path = './uploads/' + document[0].fname;
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
