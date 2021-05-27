odoo.define('discuss_emoji.ThreadWindow', function(require) {
	var thread_window = require('mail.ThreadWindow');
	
	thread_window.include({
		updateEmojiMessage: function(data) {
			console.log('recevice data', data);
			var self = this;
			var message_id = data['message_id'];
			var emoji_id = data['emoji_id'];
			var emoji_owner_id = data['partner_id'];
			var emoji_owner_name = data['emoji_owner_name'];
			self.update_emoji_archive(message_id, emoji_id, emoji_owner_id, emoji_owner_name);
			// Update emoji list for message
			self.render_emoji_for_message(message_id);
		}
	})
})