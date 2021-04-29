odoo.define('discuss_emoji.discuss', function(require) {
	var BasicComposer = require('mail.composer.Basic');
	var Discuss = require('mail.Discuss');
	Discuss.include({
		/**
		* @Overwrite
	    * @private
	    */
		_initRender: function() {
			this._basicComposer = new BasicComposer(this, {
	            mentionPartnersRestricted: true,
	            showTyping: true,
	        });
			 this._basicComposer
            .on('drop_message_emoji', this, this._onDropMessageEmoji)
		},
		/**
	     * @private
	    */
		_onDropMessageEmoji: function() {
			console.log('mmm');
		}
	});
});