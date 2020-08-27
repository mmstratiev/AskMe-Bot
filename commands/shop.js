const localization = require('../localization.json');
const { shop_command } = require('../commands.json');

const { MessageEmbed } = require('discord.js');
const { prefix } = require('../config.json');

const Command = require('./classes/command');
class ShopCommand extends Command {
	async execute_internal(message, args) {
		let embedDescription = `${localization.reply_help_description}\n`;

		const subCommands = this.getSubCommands();
		for (const [subCommandName, subCommand] of subCommands) {
			if (subCommand.matchPermissions(message.member.permissions)) {
				embedDescription += `\`${prefix}${this.name} ${subCommandName}\` - ${subCommand.description}\n`;
			}
		}

		let helpEmbed = new MessageEmbed()
			.setTitle(localization.reply_help_cart_title)
			.setColor('#43b581')
			.setDescription(embedDescription);

		message.reply(helpEmbed);
	}
}

module.exports = new ShopCommand(shop_command, localization.shop_description, [
	0,
]);
