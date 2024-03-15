/**
 * tools store
 */
"use strict";

const ts = require('tools-ts')('tools:store');
const fs = require('tools-vfs');

const $stripe_pk = process.env.STRIPE_PK || '';
const $stripe_sk = process.env.STRIPE_SK || '';
const $store_name = process.env.STORE_NAME || 'toolsOS store';
const $stripe_ver = '2018-02-28';
const $stripe_url = 'https://dashboard.stripe.com/products';
const stripe = require("stripe")($stripe_sk);
stripe.setApiVersion($stripe_ver);

const $lstore = '/store';
const $litems = $lstore + '/items';
const $lorder = $lstore + '/order.html';

let $tos = process.env.tools_TOS || '';
if ($tos !== '') $tos = '<h2 class="uppercase"><a href="' + $tos + '" target="_blank">Legal</a></h2>';

const aspa = require('tools-spa')();
const route = aspa.router();

const $cur = new Map();
$cur.set('usd','<i class="fas fa-dollar-sign"></i>');
$cur.set('eur','<i class="fas fa-euro-sign"></i>');
$cur.set('gbp','<i class="fas fa-pound-sign"></i>');


const initTags = () => {
	const tags = new Map();
	tags.set('latest', new Set());
	tags.set('featured', new Set());
	tags.set('all', new Set());
	return tags;
};

let $tags = initTags();
let $items = null;
let $_page = null;

const $products = (res, cb, force=false) => {
	res.body = $page();
	if (($stripe_pk === '') || $stripe_sk === ''){
		return res.send(200, {title: '', body: 'No Stripe keys?!'});
	}

	if (typeof cb !== 'function') cb = ()=>{return '';};

	if ($items && !force){
		return res.send(200, {title: 'store', body: cb()});
	}

	stripe.products.list({ limit: 32 }, (err, products) => {
	    if (err){
			ts.error(38,err);
			return res.send(200, {title: '', body: aspa.link($stripe_url,'No products?!')});
		}
	    $items = products.data;
	    if (!$items) return res.send(200, {title: 'store', body: 'error'});

		let tags;
		for (let it of $items){
			$tags.get('all').add(it);
			tags = (it.metadata && it.metadata.tags) || null;
			if (ts.is(tags,String)){
				tags = ts.trim(tags.split(','));
				if (tags.includes('latest')) $tags.get('latest').add(it);
				if (tags.includes('featured')) $tags.get('featured').add(it);
			}
		}

		res.send(200, {title: 'store', body: cb() + $tos});
	});
};

const $page = () => {
	if ($_page) return $_page;
	// FIXME: '/_store/index.html'
	const f = __dirname + '/index.html';
	$_page = fs.existsSync(f)? fs.readFileSync(f,'utf8') : 
				aspa.page('<%title%>','<%body%>');
	return $_page;
};

const $mkItem = (it) => {
	let s = '';
	if (!it) return s;
	let name, desc, url, img, price, cur;
	name = it.name || null;
	if (name) name = name.substr(0,12);
	desc = it.description || null;
	if (desc) desc = desc.substr(0,18);
	url = it.url || null;
	img = (it.images && it.images[0]) || null;
	price = cur = null;
	if (it.skus && it.skus.data && it.skus.data[0]){
		price = it.skus.data[0].price;
		cur = it.skus.data[0].currency;
	}
	if (!name || !desc || !url || !img || !price || !cur) return s;
	s += '<div class="item shadow">';
	s += ''+'<a href="'+url+'" target="_blank"><img style="width:150px;height:150px;"  src="' + img + '" width="150" height="150" /></a>';
	let p = price/100;
	let c = $cur.has(cur) ? $cur.get(cur) : $cur.get('usd');
	c = cur === 'usd' ? c + p : p + c;
	s += '<p class="stats">'+ c +'</p>';
	s += '<h3 class="name">'+name+' <a href="'+url+'" target="_blank"><i class="fas fa-info-circle"></i></a></h3>';
	s += '<p class="desc">'+desc+'</p>';
	s += `<form action="/store/checkout" method="POST">
  <input type="hidden" name="amount" value="`+price+`">
  <input type="hidden" name="currency" value="`+cur+`">
  <input type="hidden" name="name" value="`+name+`">
  <input type="hidden" name="desc" value="`+desc+`">`;
	s += `<script
     src="https://checkout.stripe.com/checkout.js" class="stripe-button"
     data-key="`+$stripe_pk+`"
     data-amount="`+price+`"
     data-name="tondy.com"
     data-description="`+name+`"
     data-image="https://tondy67.github.io/img/toolsos.png"
     data-locale="auto"
     data-currency="`+cur+`"
     data-zip-code="true">
  </script>`;
	s += '</form>';
	s += '</div>';
	return s;
};

const $cat = (cat, max=4) => {
	let s = '', i = 0;
	const c = $tags.get(cat);
	if (c && c.size > 0){
		if (cat === 'featured') cat = aspa.link($lorder,cat);
		else if (cat === 'all') cat = aspa.link($litems,cat);
		s += '<h2 class="uppercase">'+cat+'</h2><div class="row">';
		for (let it of c){
			if (it){
				s += $mkItem(it);
				i++;
			}
			if (i > max) break;
		}
		s += '</div>';
	}
	return s;
};

route.post('/checkout', (res, post) => {
	res.body = $page();
	const p = post.params;
	const token = p.stripeToken; 
	const amount = p.amount;
	const cur = p.currency;
	const desc = p.desc;
	// Charge the user's card:
	if (amount > 50) stripe.charges.create({
		amount: amount,
		currency: cur,
		description: desc,
		source: token,
		metadata: {name: p.name}
	}, (err, charge) => {
		if (err){
			ts.error(104,err);
			aspa.redirect(res,'/store/#msg=Charge error!');
		}
//		ts.log(107,charge);
	});
	aspa.redirect(res,'/store/#msg=Thank you!');
});
route.post('/order', (res, post) => {
	res.body = $page();
	const p = post.params;
	let amount = null;
	try{ 
		amount = Math.floor(parseFloat(p.amount.replace(',','.')) * 100);
		if (amount < 0) amount = null;
	}catch(e){}
	const cur = p.currency;
	const desc = p.desc;
	const name = p.name;
	const pos = p.pos;

	let s = '<h3>' + aspa.link($lstore,'Store') + '</h3>';
	if (amount && cur && desc && pos) s += `<form action="/store/checkout" method="POST">
	<input type="hidden" name="amount" value="`+amount+`">
	<input type="hidden" name="currency" value="`+cur+`">
	<input type="hidden" name="name" value="`+name+` (`+pos+`)">
	<input type="hidden" name="desc" value="`+desc+`">
	<script src="https://checkout.stripe.com/checkout.js" class="stripe-button" 
	data-key="`+$stripe_pk+`" 
	data-amount="`+amount+`" 
	data-name="tondy.com" 
	data-description="`+desc+`" 
	data-image="https://tondy67.github.io/img/toolsos.png" 
	data-locale="auto" 
	data-currency="`+cur+`" 
	data-zip-code="true">
	</script>
	</form>`;
	res.send(200, {title: 'Order', body: s});
});

route.get('/order.html', res => {
	res.body = $page();
	let s = '<h3>' + aspa.link($lstore,'Store') + '</h3>';
	s += `<div id="box" style="visibility:hidden;">
<form action="/store/order" method="POST">
  <input type="hidden" name="pos" id="order-pos" value="">
Please, enter the amount and click <b>Next</b>
<ul>
  <li><ul class="tbl"><li class="lcol">Amount</li><li><input type="text" name="amount" value="1">
  <select name="currency" >
   <option value="usd">USD</option>
   <option value="eur">EUR</option>
   <option value="gbp">GBP</option>
   <option value="cad">CAD</option>
   <option value="aud">AUD</option>
  </select></li></ul></li> 
  <li><ul class="tbl"><li class="lcol">Product</li><li><input type="text" name="desc" value="Donation"></li></ul></li>  
  <li><ul class="tbl"><li class="lcol">Your name</li><li><input type="text" name="name" value=""></li></ul></li>  
  <li><ul class="tbl"><li class="lcol"><input type="submit" value="Next" /></li><li></li></ul></li>  
</ul>
</form>
</div>`;
	s += `<script>
(() => {
const $sel = (t) => { return document.querySelector(t); };
const getLocation = () => {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(geopos, geoerr);
	}else{ 
		console.log("Geolocation is not supported by this browser.");
	}
};
const geoerr = (err) => {
	switch(err.code) {
	case err.PERMISSION_DENIED:
		console.log("User denied the request for Geolocation.");
		break;
	case err.POSITION_UNAVAILABLE:
		console.log("Location information is unavailable.");
		break;
	case err.TIMEOUT:
		console.log("The request to get user location timed out.");
		break;
	case err.UNKNOWN_ERROR:
		console.log("An unknown error occurred.");
		break;
	}
};
const geopos = (pos) => {
	if (!pos) return;
	const lat = pos.coords.latitude;
	const lon = pos.coords.longitude;
    var el = $sel("#box");
    if (el) el.style.visibility = 'visible';
	el = $sel("#order-pos");
    if (el) el.value = lat+':'+lon;
};
getLocation();
})();
</script>`;
	res.send(200, {title: 'Order', body: s});
});

route.get('/items', res => {
	$tags = initTags();
	$products(res, () => {
		let s = '<h3>' + aspa.link($lstore,'Store') + '</h3>';
		s += '<div class="row">';
	    for (let it of $items) if (it) s += $mkItem(it);
		s += '</div>';
	    return s;
	}, true);
});

route.get('/', res => {
	$products(res, () => {
		const latest = $tags.get('latest');
		const featured = $tags.get('featured');
		let s = '';
		s += $cat('latest');
		s += $cat('featured');
		s += $cat('all',12);
	    return s;
	});
});

route.match('/(.*)',(match, res) => {
	$products(res, () => {
		const latest = $tags.get('latest');
		const featured = $tags.get('featured');
		let s = '';
		s += $cat('latest');
		s += $cat('featured');
		s += $cat('all',12);
	    return s;
	});
});


module.exports = route;
