const SubCommand = require('../classes/subcommand');

class AskMe_Add extends SubCommand {
	execute(message, args) {
		message.reply('Askme_Add');
	}
}

module.exports = new AskMe_Add('add', 'Desc', [], 'Usage');
