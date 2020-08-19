const {
	empty_command_usage,
	help_command_usage,
} = require('../localization.json');
const { help_command } = require('../commands.json');

const { prefix } = require('../config.json');
const utilities = require('../utilities.js');


// TODO: Update this command last after everything else is done
const Command = require('./classes/command');
class HelpCommand extends Command {
	execute_internal(message, args) {
		const commands = utilities.getCommandsCollection();
		let messageReply = '';

		if (args.length == 0) {
			// no arguments, display help for all commands
			messageReply = 'To talk to me use any of the following commands:\n';

			for (const [commandName, command] of commands) {
				messageReply += `\`${prefix}${commandName} ${command.usage}\` - ${command.description} \n`;
			}
		} else {
			// one argument, try to display information about the command that matches that argument
			const command = commands.get(args[0]);
			messageReply += `\`${prefix}${command.name} ${command.usage}\` - ${command.description} \n`;
		}

		message.reply(messageReply);
	}
}

module.exports = new HelpCommand(
	help_command,
	'Displays help about all available commands or specific command.',
	[0, 1],
	[empty_command_usage, help_command_usage]
);
