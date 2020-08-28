const AsyncLock = require('async-lock');
var lock = new AsyncLock();

module.exports = class MessageCleaner {
	constructor() {
		this.messages = [];
	}

	push(message) {
		lock.acquire('messagesArray', () => {
			this.messages.push(message);
		});
	}

	async clean(options) {
		const optionsInternal = options || {};
		const timeout = optionsInternal.timeout || 0;

		setTimeout(() => {
			lock.acquire('messagesArray', () => {
				this.messages.forEach((message) => {
					if (!message.deleted) {
						message.delete();
					}
				});

				this.messages = [];
			});
		}, timeout);
	}
};
