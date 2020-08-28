const localization = require('../localization.json');
const { help_command } = require('../commands.json');

const { prefix } = require('../config.json');
const utilities = require('../classes/utilities.js');

const { MessageEmbed } = require('discord.js');
const Command = require('../classes/command');
class HelpCommand extends Command {
	execute_internal(message, args) {
		const commands = utilities.getCommandsCollection();
		let embedDescription = `${localization.reply_help_description}\n`;

		for (const [commandName, command] of commands) {
			if (commandName != this.name) {
				if (command.matchPermissions(message.member.permissions)) {
					embedDescription += `\`${prefix}${commandName}\` - ${command.description}\n`;

					const subCommands = command.getSubCommands();
					for (const [subCommandName, subCommand] of subCommands) {
						if (
							subCommand.matchPermissions(
								message.member.permissions
							)
						) {
							embedDescription += `\`${prefix}${commandName} ${subCommandName}\` - ${subCommand.description}\n`;
						}
					}
				}
			}
		}

		let helpEmbed = new MessageEmbed()
			.setTitle(localization.reply_help_title)
			.setColor('#43b581')
			.setDescription(embedDescription);

		message.reply(helpEmbed);
	}
}

module.exports = new HelpCommand(
	help_command,
	localization.help_description
	[0]
);
