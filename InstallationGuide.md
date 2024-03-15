# [abv-store](./README.md) installation guide

**Note** *5 March 2018: It's under development but it's a fully functional*
### Prerequisites:

* You have installed [nodejs](https://nodejs.org/en/download/), [git](https://git-scm.com/downloads) 
and [text editor](https://www.geany.org/)
* You have ready to use [stripe](https://stripe.com/), [heroku](https://heroku.com) or [now](https://zeit.co/now) accounts

You don't need to be tech guru to start [the store](./README.md). 
If you follow the instructions you'll be able to have set up and running the store for about a minutes.
My cat [Mazinka](https://www.youtube.com/watch?v=npbdoImToMU) regularly do it when she decide to walk over my keyboard :)

### Instalation

1. Install the [heroku client](https://www.npmjs.com/package/heroku-cli)

   `$ sudo npm i -g heroku-cli`

2. Clone the source locally

   `$ git clone https://github.com/tondy67/abv-store.git`  
   `$ cd abv-store`
   
   Create a new empty [application](https://devcenter.heroku.com/articles/creating-apps#creating-a-named-app) on [Heroku](https://devcenter.heroku.com/articles/git#creating-a-heroku-remote)

   `$ heroku create`

3. Make any necessary changes in the folder **'public/afs'** which is the root of [abv-vfs](https://github.com/tondy67/abv-vfs) virtual file system.  
Every subfolder is a product (item/service) and consist of three files. You have to edit **'meta.js'** which is a plain [json](https://en.wikipedia.org/wiki/JSON) file and replace the image **'logo.png'** with your own. You may use one of 'Donation' folders as template.

   
   `$ cp -a "Donation 1" MyProduct`

4. Deploy to Heroku

   `$ git add .`

   `$ git commit -m "MyProduct"`

   `$ git push heroku master`

5. Set the environment variables **STRIPE_PK** (your_stripe_public_key), **STRIPE_SK** (your_stripe_secret_key), **STORE_NAME** (your_store_name)
in the Heroku dashboard under the **'Settings/Config Variables'** menu and restart the [dyno](https://www.heroku.com/dynos). *You need this step only when you have to change the stripe api keys from test to live mode for example*

   
6. ...And you are in the business :)

Now, when you want to add/delete/change the product list just repeat the steps 3 and 4 above.
Heroku will deploy it just in seconds

> You can copy/zip/backup the entire **'public/afs'** folder and work with it offline and off-app. 
To see your changes just open any **'view.html'** file with the [Firefox web browser](https://www.mozilla.org/en-US/firefox/).
