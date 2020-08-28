const fs = require('fs');
const discord = require('discord.js');
const Database = require('better-sqlite3');
const settings = require('../server_settings.json').settings;

module.exports.getCommandsCollection = () => {
	// Setup commands
	let commands = new discord.Collection();

	// get all .js files in "commands" folder
	const commandFiles = fs
		.readdirSync('./commands')
		.filter((file) => file.endsWith('.js'));
	for (const file of commandFiles) {
		const command = require(`../commands/${file}`);

		// set a new item in the Collection
		// with the key as the command name and the value as the exported module
		commands.set(command.name, command);
	}
	return commands;
};

module.exports.openDatabase = () => {
	return new Database('./data.db', { verbose: console.log });
};

module.exports.getServerSettingValue = (serverId, settingId) => {
	const db = this.openDatabase();
	let result = '';

	try {
		let settingRow = db
			.prepare(
				'SELECT setting_value FROM settings WHERE server_id=? AND setting_name=?'
			)
			.get([serverId, settingId]);

		if (settingRow) {
			result = settingRow.setting_value;
		} else {
			const setting = settings.find((setting) => {
				setting.id === settingId;
			});

			if (setting) {
				result = setting.default_value;
			}
		}
	} catch (error) {
		console.error();
	} finally {
		db.close();
	}

	return result;
};
