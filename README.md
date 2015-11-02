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

---

#Article Mongoose Model - in app/models

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