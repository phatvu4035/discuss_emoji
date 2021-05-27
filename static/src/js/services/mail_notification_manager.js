odoo.define('discuss_emoji.Mail.Notification.Manager', function(require) {
	var mail_notification_manager = require('mail.Manager.Notification');
	mail_notification_manager.include({
		/**
		* @overwrite
		*/
		_handleChannelNotification: function(params) {
			var self = this;
			console.log('_handleChannelNotification overwrite');
			if (params.data && params.data.info === 'user_drop_emoji') {
				this._handleUserDropEmoji(params.data)
				return;
			}
			self._super.apply(self, arguments);
		},
		/**
	     * Called when a emoji is dropped on a channel
	     *
	     * @private
	     * @param {Object} messageData
	     * @param {integer[]} messageData.channel_ids channel IDs
	     */
		 _handleUserDropEmoji: function(messageData) {
			/*console.log('hanleuser drop emoji', messageData)
			 var self = this;
	         var def;
	         if (messageData.channel_ids.length === 1) {
	             def = this.joinChannel(messageData.channel_ids[0], { autoswitch: false });
	         } else {
	             def = Promise.resolve();
	         }
			 def.then(function () {
	             return self.updateEmoji(messageData);
	         });*/
			 var message = this.getMessage(messageData['message_id'])
			 this._mailBus.trigger('user_drop_emoji', message, messageData);	
			
		},
		updateEmoji: function(data) {
			console.log('updateEmoji user_drop_emoji')
			var message = this.getMessage(data['message_id'])
			this._mailBus.trigger('user_drop_emoji', message, data);
		},
	});
});