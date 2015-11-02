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

# 5. Let's add a User Mongoose Model too (app/models)

`article.server.model.js`

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

# Configure Mongoose (app/config)

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