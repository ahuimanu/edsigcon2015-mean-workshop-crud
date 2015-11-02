#MEAN CRUD WALKTHROUGH

# 0 - Mongod

```JavaScript
#!/bin/bash
mkdir data
echo 'mongod --bind_ip=$IP --dbpath=data --nojournal --rest "$@"' > mongod
chmod a+x mongod
```

---

# 1 - package.json

```JavaScript
{
	"name": "MEAN-CRUD",
	"version": "0.0.1",
	"dependencies": {
		"express": "~4.13.3",
		"morgan": "~1.6.1",
		"compression": "~1.6.0",
		"body-parser": "~1.14.1",
		"method-override": "~2.3.5",
		"express-session": "~1.11.3",
		"ejs": "~2.3.4",
		"connect-flash": "~0.1.1",
		"mongoose": "~4.1.10",
		"passport": "~0.3.0",
		"passport-local": "~1.0.0",
		"passport-facebook": "~2.0.0",
		"passport-twitter": "~1.0.3",
		"passport-google-oauth": "~0.2.0"
	}
}
```

Next, type `npm install` in the console

---

#2 - bower.json

First, ensure bower is installed:

`npm install -g bower`

```JavaScript
{
	"name": "MEAN-CRUD",
	"version": "0.0.1",
	"dependencies": {
		"angular": "~1.2",
		"angular-route": "~1.2",	
		"angular-resource": "~1.2"
	}
}
```

---

#3 - .bowerrc

```JavaScript
{ 
    "directory": "public/lib" 
}
```

Next, type `bower install` in the console.

---

##3.1 Gitignore (if using Git, ignore the data directory)

`.gitignore`

```JavaScript
data/
```

# 4. Article Mongoose Model - in app/models

`article.server.model.js`

```JavaScript
// Invoke 'strict' JavaScript mode
'use strict';

// Load the module dependencies
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// Define a new 'ArticleSchema'
var ArticleSchema = new Schema({
	created: {
		type: Date,
		default: Date.now
	},
	title: {
		type: String,
		default: '',
		trim: true,
		required: 'Title cannot be blank'
	},
	content: {
		type: String,
		default: '',
		trim: true
	},
	creator: {
		type: Schema.ObjectId,
		ref: 'User'
	}
});

// Create the 'Article' model out of the 'ArticleSchema'
mongoose.model('Article', ArticleSchema);
```

---

# 5. Let's add a User Mongoose Model too (app/models)

`user.server.model.js`

```JavaScript
// Invoke 'strict' JavaScript mode
'use strict';

// Load the module dependencies
var mongoose = require('mongoose'),
	crypto = require('crypto'),
	Schema = mongoose.Schema;

// Define a new 'UserSchema'
var UserSchema = new Schema({
	firstName: String,
	lastName: String,
	email: {
		type: String,
		// Validate the email format
		match: [/.+\@.+\..+/, "Please fill a valid email address"]
	},
	username: {
		type: String,
		// Set a unique 'username' index
		unique: true,
		// Validate 'username' value existance
		required: 'Username is required',
		// Trim the 'username' field
		trim: true
	},
	password: {
		type: String,
		// Validate the 'password' value length
		validate: [

			function(password) {
				return password && password.length > 6;
			}, 'Password should be longer'
		]
	},
	salt: {
		type: String
	},
	provider: {
		type: String,
		// Validate 'provider' value existance
		required: 'Provider is required'
	},
	providerId: String,
	providerData: {},
	created: {
		type: Date,
		// Create a default 'created' value
		default: Date.now
	}
});

// Set the 'fullname' virtual property
UserSchema.virtual('fullName').get(function() {
	return this.firstName + ' ' + this.lastName;
}).set(function(fullName) {
	var splitName = fullName.split(' ');
	this.firstName = splitName[0] || '';
	this.lastName = splitName[1] || '';
});

// Use a pre-save middleware to hash the password
UserSchema.pre('save', function(next) {
	if (this.password) {
		this.salt = new Buffer(crypto.randomBytes(16).toString('base64'), 'base64');
		this.password = this.hashPassword(this.password);
	}

	next();
});

// Create an instance method for hashing a password
UserSchema.methods.hashPassword = function(password) {
	return crypto.pbkdf2Sync(password, this.salt, 10000, 64).toString('base64');
};

// Create an instance method for authenticating user
UserSchema.methods.authenticate = function(password) {
	return this.password === this.hashPassword(password);
};

// Find possible not used username
UserSchema.statics.findUniqueUsername = function(username, suffix, callback) {
	var _this = this;

	// Add a 'username' suffix
	var possibleUsername = username + (suffix || '');

	// Use the 'User' model 'findOne' method to find an available unique username
	_this.findOne({
		username: possibleUsername
	}, function(err, user) {
		// If an error occurs call the callback with a null value, otherwise find find an available unique username
		if (!err) {
			// If an available unique username was found call the callback method, otherwise call the 'findUniqueUsername' method again with a new suffix
			if (!user) {
				callback(possibleUsername);
			} else {
				return _this.findUniqueUsername(username, (suffix || 0) + 1, callback);
			}
		} else {
			callback(null);
		}
	});
};

// Configure the 'UserSchema' to use getters and virtuals when transforming to JSON
UserSchema.set('toJSON', {
	getters: true,
	virtuals: true
});

// Create the 'User' model out of the 'UserSchema'
mongoose.model('User', UserSchema);
```

---

# 6. Configure Mongoose (app/config)

`mongoose.js`

```JavaScript
// Invoke 'strict' JavaScript mode
'use strict';

// Load the module dependencies
var	config = require('./config'),
	mongoose = require('mongoose');

// Define the Mongoose configuration method
module.exports = function() {
	// Use Mongoose to connect to MongoDB
	var db = mongoose.connect(config.db);

	// Load the application models 
	require('../app/models/user.server.model');
	require('../app/models/article.server.model');

	// Return the Mongoose connection instance
	return db;
};
```

---

# 7. Configure Express Controllers

## 7.1 Article Controller (app/controllers)

`articles.server.controller.js`

Wherein we **CRUD**

```JavaScript
// Invoke 'strict' JavaScript mode
'use strict';

// Load the module dependencies
var mongoose = require('mongoose'),
	Article = mongoose.model('Article');

// Create a new error handling controller method
var getErrorMessage = function(err) {
	if (err.errors) {
		for (var errName in err.errors) {
			if (err.errors[errName].message) return err.errors[errName].message;
		}
	} else {
		return 'Unknown server error';
	}
};

// Create a new controller method that creates new articles
exports.create = function(req, res) {
	// Create a new article object
	var article = new Article(req.body);

	// Set the article's 'creator' property
	article.creator = req.user;

	// Try saving the article
	article.save(function(err) {
		if (err) {
			// If an error occurs send the error message
			return res.status(400).send({
				message: getErrorMessage(err)
			});
		} else {
			// Send a JSON representation of the article 
			res.json(article);
		}
	});
};

// Create a new controller method that retrieves a list of articles
exports.list = function(req, res) {
	// Use the model 'find' method to get a list of articles
	Article.find().sort('-created').populate('creator', 'firstName lastName fullName').exec(function(err, articles) {
		if (err) {
			// If an error occurs send the error message
			return res.status(400).send({
				message: getErrorMessage(err)
			});
		} else {
			// Send a JSON representation of the article 
			res.json(articles);
		}
	});
};

// Create a new controller method that returns an existing article
exports.read = function(req, res) {
	res.json(req.article);
};

// Create a new controller method that updates an existing article
exports.update = function(req, res) {
	// Get the article from the 'request' object
	var article = req.article;

	// Update the article fields
	article.title = req.body.title;
	article.content = req.body.content;

	// Try saving the updated article
	article.save(function(err) {
		if (err) {
			// If an error occurs send the error message
			return res.status(400).send({
				message: getErrorMessage(err)
			});
		} else {
			// Send a JSON representation of the article 
			res.json(article);
		}
	});
};

// Create a new controller method that delete an existing article
exports.delete = function(req, res) {
	// Get the article from the 'request' object
	var article = req.article;

	// Use the model 'remove' method to delete the article
	article.remove(function(err) {
		if (err) {
			// If an error occurs send the error message
			return res.status(400).send({
				message: getErrorMessage(err)
			});
		} else {
			// Send a JSON representation of the article 
			res.json(article);
		}
	});
};

// Create a new controller middleware that retrieves a single existing article
exports.articleByID = function(req, res, next, id) {
	// Use the model 'findById' method to find a single article 
	Article.findById(id).populate('creator', 'firstName lastName fullName').exec(function(err, article) {
		if (err) return next(err);
		if (!article) return next(new Error('Failed to load article ' + id));

		// If an article is found use the 'request' object to pass it to the next middleware
		req.article = article;

		// Call the next middleware
		next();
	});
};

// Create a new controller middleware that is used to authorize an article operation 
exports.hasAuthorization = function(req, res, next) {
	// If the current user is not the creator of the article send the appropriate error message
	if (req.article.creator.id !== req.user.id) {
		return res.status(403).send({
			message: 'User is not authorized'
		});
	}

	// Call the next middleware
	next();
};
```

---

## 7.2 User Controller (app/controllers)

`users.server.controller.js`

```JavaScript
// Invoke 'strict' JavaScript mode
'use strict';

// Load the module dependencies
var User = require('mongoose').model('User'),
	passport = require('passport');

// Create a new error handling controller method
var getErrorMessage = function(err) {
	// Define the error message variable
	var message = '';

	// If an internal MongoDB error occurs get the error message
	if (err.code) {
		switch (err.code) {
			// If a unique index error occurs set the message error
			case 11000:
			case 11001:
				message = 'Username already exists';
				break;
			// If a general error occurs set the message error
			default:
				message = 'Something went wrong';
		}
	} else {
		// Grab the first error message from a list of possible errors
		for (var errName in err.errors) {
			if (err.errors[errName].message) message = err.errors[errName].message;
		}
	}

	// Return the message error
	return message;
};

// Create a new controller method that renders the signin page
exports.renderSignin = function(req, res, next) {
	// If user is not connected render the signin page, otherwise redirect the user back to the main application page
	if (!req.user) {
		// Use the 'response' object to render the signin page
		res.render('signin', {
			// Set the page title variable
			title: 'Sign-in Form',
			// Set the flash message variable
			messages: req.flash('error') || req.flash('info')
		});
	} else {
		return res.redirect('/');
	}
};

// Create a new controller method that renders the signup page
exports.renderSignup = function(req, res, next) {
	// If user is not connected render the signup page, otherwise redirect the user back to the main application page
	if (!req.user) {
		// Use the 'response' object to render the signup page
		res.render('signup', {
			// Set the page title variable
			title: 'Sign-up Form',
			// Set the flash message variable
			messages: req.flash('error')
		});
	} else {
		return res.redirect('/');
	}
};

// Create a new controller method that creates new 'regular' users
exports.signup = function(req, res, next) {
	// If user is not connected, create and login a new user, otherwise redirect the user back to the main application page
	if (!req.user) {
		// Create a new 'User' model instance
		var user = new User(req.body);
		var message = null;

		// Set the user provider property
		user.provider = 'local';

		// Try saving the new user document
		user.save(function(err) {
			// If an error occurs, use flash messages to report the error
			if (err) {
				// Use the error handling method to get the error message
				var message = getErrorMessage(err);

				// Set the flash messages
				req.flash('error', message);

				// Redirect the user back to the signup page
				return res.redirect('/signup');
			}

			// If the user was created successfully use the Passport 'login' method to login
			req.login(user, function(err) {
				// If a login error occurs move to the next middleware
				if (err) return next(err);

				// Redirect the user back to the main application page
				return res.redirect('/');
			});
		});
	} else {
		return res.redirect('/');
	}
};

// Create a new controller method that creates new 'OAuth' users
exports.saveOAuthUserProfile = function(req, profile, done) {
	// Try finding a user document that was registered using the current OAuth provider
	User.findOne({
		provider: profile.provider,
		providerId: profile.providerId
	}, function(err, user) {
		// If an error occurs continue to the next middleware
		if (err) {
			return done(err);
		} else {
			// If a user could not be found, create a new user, otherwise, continue to the next middleware
			if (!user) {
				// Set a possible base username
				var possibleUsername = profile.username || ((profile.email) ? profile.email.split('@')[0] : '');

				// Find a unique available username
				User.findUniqueUsername(possibleUsername, null, function(availableUsername) {
					// Set the available user name 
					profile.username = availableUsername;
					
					// Create the user
					user = new User(profile);

					// Try saving the new user document
					user.save(function(err) {
						// Continue to the next middleware
						return done(err, user);
					});
				});
			} else {
				// Continue to the next middleware
				return done(err, user);
			}
		}
	});
};

// Create a new controller method for signing out
exports.signout = function(req, res) {
	// Use the Passport 'logout' method to logout
	req.logout();

	// Redirect the user back to the main application page
	res.redirect('/');
};

// Create a new controller middleware that is used to authorize authenticated operations 
exports.requiresLogin = function(req, res, next) {
	// If a user is not authenticated send the appropriate error message
	if (!req.isAuthenticated()) {
		return res.status(401).send({
			message: 'User is not logged in'
		});
	}

	// Call the next middleware
	next();
};
```

---

# 8. Express Routes (app/routes)

##8.1 Articles Routes (app/routes)

`articles.server.routes.js`

```JavaScript
// Invoke 'strict' JavaScript mode
'use strict';

// Load the module dependencies
var users = require('../../app/controllers/users.server.controller'),
	articles = require('../../app/controllers/articles.server.controller');

// Define the routes module' method
module.exports = function(app) {
	// Set up the 'articles' base routes 
	app.route('/api/articles')
	   .get(articles.list)
	   .post(users.requiresLogin, articles.create);
	
	// Set up the 'articles' parameterized routes
	app.route('/api/articles/:articleId')
	   .get(articles.read)
	   .put(users.requiresLogin, articles.hasAuthorization, articles.update)
	   .delete(users.requiresLogin, articles.hasAuthorization, articles.delete);

	// Set up the 'articleId' parameter middleware   
	app.param('articleId', articles.articleByID);
};
```

---

##8.2 Index Routes (app/routes)

`index.server.routes.js`

```JavaScript
// Invoke 'strict' JavaScript mode
'use strict';

// Define the routes module' method
module.exports = function(app) {
	// Load the 'index' controller
	var index = require('../controllers/index.server.controller');

	// Mount the 'index' controller's 'render' method
	app.get('/', index.render);
};
```

---

##8.3 Users Routes (app/routes)

`users.server.routes.js`

```JavaScript
// Invoke 'strict' JavaScript mode
'use strict';

// Load the module dependencies
var users = require('../../app/controllers/users.server.controller'),
	passport = require('passport');

// Define the routes module' method
module.exports = function(app) {
	// Set up the 'signup' routes 
	app.route('/signup')
	   .get(users.renderSignup)
	   .post(users.signup);

	// Set up the 'signin' routes 
	app.route('/signin')
	   .get(users.renderSignin)
	   .post(passport.authenticate('local', {
			successRedirect: '/',
			failureRedirect: '/signin',
			failureFlash: true
	   }));

	// Set up the Facebook OAuth routes 
	app.get('/oauth/facebook', passport.authenticate('facebook', {
		failureRedirect: '/signin'
	}));
	app.get('/oauth/facebook/callback', passport.authenticate('facebook', {
		failureRedirect: '/signin',
		successRedirect: '/'
	}));

	// Set up the Twitter OAuth routes 
	app.get('/oauth/twitter', passport.authenticate('twitter', {
		failureRedirect: '/signin'
	}));
	app.get('/oauth/twitter/callback', passport.authenticate('twitter', {
		failureRedirect: '/signin',
		successRedirect: '/'
	}));

	// Set up the Google OAuth routes 
	app.get('/oauth/google', passport.authenticate('google', {
		scope: [
			'https://www.googleapis.com/auth/userinfo.profile',
			'https://www.googleapis.com/auth/userinfo.email'
		],
		failureRedirect: '/signin'
	}));
	app.get('/oauth/google/callback', passport.authenticate('google', {
		failureRedirect: '/signin',
		successRedirect: '/'
	}));

	// Set up the 'signout' route
	app.get('/signout', users.signout);
};
```

---

# 9. Configure Express (app/config)

`express.js`

```JavaScript
// Invoke 'strict' JavaScript mode
'use strict';

// Load the module dependencies
var config = require('./config'),
	express = require('express'),
	morgan = require('morgan'),
	compress = require('compression'),
	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	session = require('express-session'),
	flash = require('connect-flash'),
	passport = require('passport');

// Define the Express configuration method
module.exports = function() {
	// Create a new Express application instance
	var app = express();

	// Use the 'NDOE_ENV' variable to activate the 'morgan' logger or 'compress' middleware
	if (process.env.NODE_ENV === 'development') {
		app.use(morgan('dev'));
	} else if (process.env.NODE_ENV === 'production') {
		app.use(compress());
	}

	// Use the 'body-parser' and 'method-override' middleware functions
	app.use(bodyParser.urlencoded({
		extended: true
	}));
	app.use(bodyParser.json());
	app.use(methodOverride());

	// Configure the 'session' middleware
	app.use(session({
		saveUninitialized: true,
		resave: true,
		secret: config.sessionSecret
	}));

	// Set the application view engine and 'views' folder
	app.set('views', './app/views');
	app.set('view engine', 'ejs');

	// Configure the flash messages middleware
	app.use(flash());

	// Configure the Passport middleware
	app.use(passport.initialize());
	app.use(passport.session());

	// Load the routing files
	require('../app/routes/index.server.routes.js')(app);
	require('../app/routes/users.server.routes.js')(app);
	require('../app/routes/articles.server.routes.js')(app);

	// Configure static file serving
	app.use(express.static('./public'));

	// Return the Express application instance
	return app;
};
```

---

# 10. Setup Server-Side EJS Template (app/views)

`index.ejs`

```HTML
<!DOCTYPE html>
<html xmlns:ng="http://angularjs.org">
<head>
	<!-- Use the 'title' property to render a page title  -->
	<title><%= title %></title>
</head>
<body>
	<!-- Render AngularJS views  -->
	<section ng-view></section>

	<!-- Render the user object -->
	<script type="text/javascript">
		window.user = <%- user || 'null' %>;
	</script>
	
	<!-- Load local libraries -->
	<script type="text/javascript" src="/lib/angular/angular.js"></script>
	<script type="text/javascript" src="/lib/angular-route/angular-route.js"></script>
	<script type="text/javascript" src="/lib/angular-resource/angular-resource.js"></script>
	
	<!-- Load the articles module -->
	<script type="text/javascript" src="/articles/articles.client.module.js"></script>
	<script type="text/javascript" src="/articles/controllers/articles.client.controller.js"></script>
	<script type="text/javascript" src="/articles/services/articles.client.service.js"></script>
	<script type="text/javascript" src="/articles/config/articles.client.routes.js"></script>

	<!-- Load the example module -->
	<script type="text/javascript" src="/example/example.client.module.js"></script>
	<script type="text/javascript" src="/example/controllers/example.client.controller.js"></script>
	<script type="text/javascript" src="/example/config/example.client.routes.js"></script>

	<!-- Load the users module -->
	<script type="text/javascript" src="/users/users.client.module.js"></script>
	<script type="text/javascript" src="/users/services/authentication.client.service.js"></script>

	<!-- Bootstrap AngularJS application -->
	<script type="text/javascript" src="/application.js"></script>
</body>
</html>
```

#11. NodeJS Server File 

`server.js`

```JavaScript
// Invoke 'strict' JavaScript mode
'use strict';

// Set the 'NODE_ENV' variable
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Load the module dependencies
var mongoose = require('./config/mongoose'),
  express = require('./config/express'),
  passport = require('./config/passport');

// Create a new Mongoose connection instance
var db = mongoose();

// Create a new Express application instance
var app = express();

// Configure the Passport middleware
var passport = passport();

// Use the Express application instance to listen to the C9 preferred port
app.listen(process.env.PORT);

// Log the server status to the console
console.log('Server running at http://localhost:' + process.env.PORT + '/');

// Use the module.exports property to expose our Express application instance for external usage
module.exports = app;
```

---

#12. AngularJS - Module (public/articles)

`articles.client.modules.js`

```JavaScript
// Invoke 'strict' JavaScript mode
'use strict';

// Create the 'articles' module
angular.module('articles', []);
```

---

#13. AngularJS - Application (public)

`application.js`

```JavaScript
// Invoke 'strict' JavaScript mode
'use strict';

// Set the main application name
var mainApplicationModuleName = 'mean';

// Create the main application
var mainApplicationModule = angular.module(mainApplicationModuleName, ['ngResource', 'ngRoute', 'users', 'example', 'articles']);

// Configure the hashbang URLs using the $locationProvider services 
mainApplicationModule.config(['$locationProvider',
	function($locationProvider) {
		$locationProvider.hashPrefix('!');
	}
]);

// Fix Facebook's OAuth bug
if (window.location.hash === '#_=_') window.location.hash = '#!';

// Manually bootstrap the AngularJS application
angular.element(document).ready(function() {
	angular.bootstrap(document, [mainApplicationModuleName]);
});
```

#14. AngularJS - Service Module to consume HTTP Endpoints (public/services)

`articles.client.service.js`

```JavaScript
// Invoke 'strict' JavaScript mode
'use strict';

// Create the 'articles' service
angular.module('articles').factory('Articles', ['$resource', function($resource) {
	// Use the '$resource' service to return an article '$resource' object
    return $resource('api/articles/:articleId', {
        articleId: '@_id'
    }, {
        update: {
            method: 'PUT'
        }
    });
}]);
```

---

#15. AngularJS - Controller Module (public/controllers)

`articles.client.controller.js`

```JavaScript
// Invoke 'strict' JavaScript mode
'use strict';

// Create the 'articles' controller
angular.module('articles').controller('ArticlesController', ['$scope', '$routeParams', '$location', 'Authentication', 'Articles',
    function($scope, $routeParams, $location, Authentication, Articles) {
    	// Expose the Authentication service
        $scope.authentication = Authentication;

        // Create a new controller method for creating new articles
        $scope.create = function() {
        	// Use the form fields to create a new article $resource object
            var article = new Articles({
                title: this.title,
                content: this.content
            });

            // Use the article '$save' method to send an appropriate POST request
            article.$save(function(response) {
            	// If an article was created successfully, redirect the user to the article's page 
                $location.path('articles/' + response._id);
            }, function(errorResponse) {
            	// Otherwise, present the user with the error message
                $scope.error = errorResponse.data.message;
            });
        };

        // Create a new controller method for retrieving a list of articles
        $scope.find = function() {
        	// Use the article 'query' method to send an appropriate GET request
            $scope.articles = Articles.query();
        };

        // Create a new controller method for retrieving a single article
        $scope.findOne = function() {
        	// Use the article 'get' method to send an appropriate GET request
            $scope.article = Articles.get({
                articleId: $routeParams.articleId
            });
        };

        // Create a new controller method for updating a single article
        $scope.update = function() {
        	// Use the article '$update' method to send an appropriate PUT request
            $scope.article.$update(function() {
            	// If an article was updated successfully, redirect the user to the article's page 
                $location.path('articles/' + $scope.article._id);
            }, function(errorResponse) {
            	// Otherwise, present the user with the error message
                $scope.error = errorResponse.data.message;
            });
        };

        // Create a new controller method for deleting a single article
        $scope.delete = function(article) {
        	// If an article was sent to the method, delete it
            if (article) {
            	// Use the article '$remove' method to delete the article
                article.$remove(function() {
                	// Remove the article from the articles list
                    for (var i in $scope.articles) {
                        if ($scope.articles[i] === article) {
                            $scope.articles.splice(i, 1);
                        }
                    }
                });
            } else {
            	// Otherwise, use the article '$remove' method to delete the article
                $scope.article.$remove(function() {
                    $location.path('articles');
                });
            }
        };
    }
]);
```

#16. AngularJS Views (public/views)

##16.1 (Create)

`create-article.client.view.html`

```HTML
<!-- The create article view -->
<section data-ng-controller="ArticlesController">
	<h1>New Article</h1>
	<!-- The new article form -->
	<form data-ng-submit="create()" novalidate>
		<div>
			<label for="title">Title</label>
			<div>
				<input type="text" data-ng-model="title" id="title" placeholder="Title" required>
			</div>
		</div>
		<div>
			<label for="content">Content</label>
			<div>
				<textarea data-ng-model="content" id="content" cols="30" rows="10" placeholder="Content"></textarea>
			</div>
		</div>
		<div>
			<input type="submit">
		</div>
		<!-- The error message element -->
		<div data-ng-show="error">
			<strong data-ng-bind="error"></strong>
		</div>
	</form>
</section>
```

---

##16.2 (List/Read)

`list-articles.client.view.html`

```HTML
<!-- The list articles view -->
<section data-ng-controller="ArticlesController" data-ng-init="find()">
	<h1>Articles</h1>
	<ul>
		<!-- The list of article -->
		<li data-ng-repeat="article in articles">
			<a data-ng-href="#!/articles/{{article._id}}" data-ng-bind="article.title"></a>
			<br>
			<small data-ng-bind="article.created | date:'medium'"></small>
			<small>/</small>
			<small data-ng-bind="article.creator.fullName"></small>
			<p data-ng-bind="article.content"></p>
		</li>
	</ul>
	<!-- If there are no articles in the list, suggest the user's create a new article -->
	<div data-ng-hide="!articles || articles.length">
		No articles yet, why don't you <a href="/#!/articles/create">create one</a>?
	</div>
</section>
```
---

##16.3 (View)

`view-article.client.view.html`

```HTML
<!-- The article view -->
<section data-ng-controller="ArticlesController" data-ng-init="findOne()">
    <h1 data-ng-bind="article.title"></h1>
    <!-- Show the editing buttons to the article creator -->
    <div data-ng-show="authentication.user._id == article.creator._id">
        <a href="/#!/articles/{{article._id}}/edit">edit</a>
        <a href="#" data-ng-click="delete();">delete</a>
    </div>
    <small>
        <em>Posted on</em>
        <em data-ng-bind="article.created | date:'mediumDate'"></em>
        <em>by</em>
        <em data-ng-bind="article.creator.fullName"></em>
    </small>
    <p data-ng-bind="article.content"></p>
</section>
```

---

##16.4 (Update)

`edit-article.client.view.html`

```HTML
<!-- The edit article view -->
<section data-ng-controller="ArticlesController" data-ng-init="findOne()">
	<h1>Edit Article</h1>
	<!-- The edited article form -->
	<form data-ng-submit="update()" novalidate>
		<div>
			<label for="title">Title</label>
			<div>
				<input type="text" data-ng-model="article.title" id="title" placeholder="Title" required>
			</div>
		</div>
		<div>
			<label for="content">Content</label>
			<div>
				<textarea data-ng-model="article.content" id="content" cols="30" rows="10" placeholder="Content"></textarea>
			</div>
		</div>
		<div>
			<input type="submit" value="Update">
		</div>
		<!-- The error message element -->
		<div data-ng-show="error">
			<strong data-ng-bind="error"></strong>
		</div>
	</form>
	</div>
</section>
```

---

#17. AngularJS Routes (public/config)

`articles.client.routes.js`

```JavaScript
// Invoke 'strict' JavaScript mode
'use strict';

// Configure the 'articles' module routes
angular.module('articles').config(['$routeProvider',
	function($routeProvider) {
		$routeProvider.
		when('/articles', {
			templateUrl: 'articles/views/list-articles.client.view.html'
		}).
		when('/articles/create', {
			templateUrl: 'articles/views/create-article.client.view.html'
		}).
		when('/articles/:articleId', {
			templateUrl: 'articles/views/view-article.client.view.html'
		}).
		when('/articles/:articleId/edit', {
			templateUrl: 'articles/views/edit-article.client.view.html'
		});
	}
]); 
```