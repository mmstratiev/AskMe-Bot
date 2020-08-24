const localization = require('../localization.json');
const utilities = require('../utilities');
const settings = require('../server_settings.json');
const { set_command } = require('../commands.json');

const { MessageEmbed } = require('discord.js');

const Command = require('./classes/command');
class SetCommand extends Command {
	async execute_internal(message, args) {
		let awaitingUserInput = true;

		// Message filter
		const awaitFilter = (m) => {
			let result = false;
			if (m.author.id === message.author.id) {
				if (!isNaN(parseInt(m.content)) || m.content === 'finish') {
					result = true;
				} else {
					m.delete();
				}
			}
			return result;
		};
		const awaitFilterValue = (m) => m.author.id === message.author.id;

		// Message conditions
		const awaitConditions = {
			idle: 1250,
			max: 100,
		};
		const awaitConditionsValue = {
			max: 1,
		};

		let settingObjects = new Array();

		Object.values(settings).forEach(function (value) {
			settingObjects.push(value);
		});

		let messagesToDelete = new Array();

		const sendSettingsMessage = function () {
			let messageIndex = 1;
			const settingsEmbed = new MessageEmbed()
				.setColor('#000000')
				.setTitle(localization.reply_set_enter_number)
				.setDescription(
					settingObjects
						.map(
							(settingObject) =>
								`\`\`\`md\n${messageIndex++}. ${
									settingObject.name
								}  \`\`\` *${settingObject.description}*`
						)
						.join(' ')
				);

			message.channel
				.send(settingsEmbed)
				.then((m) => messagesToDelete.push(m));
		};

		sendSettingsMessage();
		while (awaitingUserInput) {
			await message.channel
				.awaitMessages(awaitFilter, awaitConditions)
				.then(async (filteredSettingIndex) => {
					if (filteredSettingIndex.size > 0) {
						if (filteredSettingIndex.first().content === 'finish') {
							awaitingUserInput = false;
						} else {
							let settingIndex = parseInt(
								filteredSettingIndex.first().content - 1
							);

							if (
								settingIndex >= 0 &&
								settingIndex < settingObjects.length
							) {
								// Print out answer
								const settingObject =
									settingObjects[settingIndex];
								const settingValueEmbed = new MessageEmbed()
									.setColor('#000000')
									.setTitle(
										localization.reply_set_enter_value
									)
									.setDescription(
										`*${localization.reply_set_enter_value_expects}* \`\`\`fix\n${settingObject.expected_value}\`\`\``
									)
									.setFooter(
										localization.reply_set_enter_value_warning
									);

								message
									.reply(settingValueEmbed)
									.then((r) => messagesToDelete.push(r));
								await message.channel
									.awaitMessages(
										awaitFilterValue,
										awaitConditionsValue
									)
									.then(async (filteredValue) => {
										const newValue = filteredValue.first()
											.content;
										let db = utilities.openDatabase();

										db.prepare(
											`INSERT OR REPLACE INTO settings(server_id, setting_name, setting_value) VALUES(?,?,?)`
										).run([
											message.guild.id,
											settingObject.name,
											newValue,
										]);

										db.close();

										message
											.reply(
												localization.reply_set_updated
											)
											.then((r) =>
												r.delete({ timeout: 3500 })
											);

										filteredValue.forEach(
											(filteredMessage) =>
												messagesToDelete.push(
													filteredMessage
												)
										);
									});
							}
						}
						filteredSettingIndex.forEach((filteredMessage) =>
							messagesToDelete.push(filteredMessage)
						);

						message.channel.bulkDelete(messagesToDelete);
						messagesToDelete = new Array();

						if (awaitingUserInput) {
							sendSettingsMessage();
						}
					}
				});
		}

		message
			.reply(localization.reply_set_finished)
			.then((r) => r.delete({ timeout: 4000 }));
	}
}

module.exports = new SetCommand(
	set_command,
	localization.set_description,
	[0],
	['MANAGE_GUILD']
);
