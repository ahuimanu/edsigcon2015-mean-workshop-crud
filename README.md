#MEAN CRUD WALKTHROUGH

# 1 - Mongod

```JavaScript
#!/bin/bash
mkdir data
echo 'mongod --bind_ip=$IP --dbpath=data --nojournal --rest "$@"' > mongod
chmod a+x mongod
```

# 1 - package.json

```JavaScript
{
	"name": "MEAN",
	"version": "0.0.8",
	"dependencies": {
		"express": "~4.8.8",
		"morgan": "~1.3.0",
		"compression": "~1.0.11",
		"body-parser": "~1.8.0",
		"method-override": "~2.2.0",
		"express-session": "~1.7.6",
		"ejs": "~1.0.0",
		"connect-flash": "~0.1.1",
		"mongoose": "~3.8.15",
		"passport": "~0.2.1",
		"passport-local": "~1.0.0",
		"passport-facebook": "~1.0.3",
		"passport-twitter": "~1.0.2",
		"passport-google-oauth": "~0.1.5"
	}
}
```