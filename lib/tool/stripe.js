stripe = require("stripe")(app.config.stripecode);

var staticApp = {

    createCustomer: function( stripeToken, address, cb )
    {
        console.log("createCustomer()");
        stripe.customers.create({
            source: stripeToken,
            description: address,
        }, function(err, customer) {
            if( err ) {
                cb(err);
            } else {
                cb(null, customer);
            }
        });
    },

    chargeCustomer: function(customerId, amt, descr, cb) {
        var charge = stripe.charges.create({
            amount: amt, // amount in cents, again
            description: descr,
            currency: "usd",
            customer: customerId
        }, function(err, charge) {
            if (err && err.type === 'StripeCardError') {
                //The card has been declined
                cb('declined');
            } else if( err ) {
                cb(err);
            } else {
                cb(null, charge);
            }
        });
    },

    run: function(exports) {
        for( i in this ) {
            if( typeof this[i] == 'function' ) exports[i] = this[i].bind(this);
            else exports[i] = this[i];
        }
    }

};

staticApp.run(module.exports);
