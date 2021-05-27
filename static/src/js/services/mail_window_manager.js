odoo.define('discuss_emoji.Manager.Window', function(require) {
	var mail_window = require('mail.Manager.Window');
	mail_window.include({
		/**
	     * @override
	     * @private
	     */
	    _listenOnBuses: function () {
	        this._super.apply(this, arguments);
			/*this._mailBus
            .on('user_drop_emoji', this, this._onUserDropEmoji)*/
	    },

		/*_onUserDropEmoji: function(message, data) {
			console.log('data user drop emoji', this._threadWindows, message)
			_.each(this._threadWindows, function (threadWindow) {
				console.log(message.getThreadIDs(), threadWindow.getID())
	            if (_.contains(message.getThreadIDs(), threadWindow.getID())) {
	                threadWindow.updateEmojiMessage(data);
	            }
	        });
		},*/
		
		
	})
});