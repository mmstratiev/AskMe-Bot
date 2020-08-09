const discord = require('discord.js');
const localization = require('./localization.json');
const utilities = require('./utilities.js');
const { prefix, token } = require('./config.json');
const { help_command } = require('./commands.json');

const client = new discord.Client();

function AddMemberToDatabase(member) {
	if (!member.bot) {
		let db = utilities.openDatabase();
		try {
			db.prepare('INSERT OR REPLACE INTO users VALUES(?,?,?)').run([
				member.user.id,
				member.guild.id,
				member.user.tag,
			]);
		} catch (error) {
			console.log(error);
		} finally {
			db.close();
		}
	}
}

function RemoveMemberFromDatabase(member) {
	if (!member.bot) {
		let db = utilities.openDatabase();
		try {
			db.prepare(
				'DELETE FROM users WHERE user_id=? AND server_id=?'
			).run([member.user.id, member.guild.id]);
		} catch (error) {
			console.log(error);
		} finally {
			db.close();
		}
	}
}

function AddServerToDatabase(guild) {
	let db = utilities.openDatabase();
	try {
		db.prepare('INSERT OR REPLACE INTO servers VALUES(?,?)').run([
			guild.id,
			guild.name,
		]);

		for (const [memberID, member] of guild.members.cache) {
			AddMemberToDatabase(member);
		}
	} catch (error) {
		console.log(error);
	} finally {
		db.close();
	}
}

function RemoveServerFromDatabase(guild) {
	try {
		db.prepare('DELETE FROM servers WHERE server_id=?').run([guild.id]);

		for (const [memberID, member] of guild.members.cache) {
			RemoveMemberFromDatabase(member);
		}
	} catch (error) {
		console.log(error);
	} finally {
		db.close();
	}
}

client.commands = utilities.getCommandsCollection();
client.on('ready', () => {
	client.user.setActivity('people Tag Me!', { type: 'WATCHING' });

	let db = utilities.openDatabase();

	// Create/update tables
	db.prepare('DROP TABLE IF EXISTS servers').run();
	db.prepare(
		'CREATE TABLE servers(server_id INTEGER PRIMARY KEY, server_name TEXT NOT NULL)'
	).run();

	db.prepare('DROP TABLE IF EXISTS users').run();
	db.prepare(
		'CREATE TABLE users(user_id INTEGER PRIMARY KEY, server_id INTEGER NOT NULL, user_name TEXT NOT NULL, UNIQUE(user_id, server_id))'
	).run();

	// Questions table shouldn't be deleted so that server based settings can be persistent
	db.prepare(
		'CREATE TABLE IF NOT EXISTS questions(question_id INTEGER PRIMARY KEY AUTOINCREMENT, server_id INTEGER NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL, UNIQUE(server_id, question))'
	).run();

	for (const [guildID, guild] of client.guilds.cache) {
		AddServerToDatabase(guild);
	}
	db.close();

	console.log('Bot is ready!');
});

client.on('guildMemberAdd', (member) => {
	AddMemberToDatabase(member);
});

client.on('guildMemberRemove', (member) => {
	RemoveMemberFromDatabase(member);
});

client.on('guildMemberUpdate', (member) => {
	AddMemberToDatabase(member);
});

client.on('guildCreate', (guild) => {
	AddServerToDatabase(guild);
});

client.on('guildDelete', (guild) => {
	RemoveServerFromDatabase(guild);
});

client.on('guildUpdate', (guild) => {
	AddServerToDatabase(guild);
});

client.on('message', (message) => {
	if (!message.author.bot) {
		if (message.content.startsWith(prefix)) {
			const args = message.content.slice(prefix.length).split(/ +/);
			const commandName = args.shift().toLowerCase();

			if (client.commands.has(commandName)) {
				try {
					const command = client.commands.get(commandName);
					command.execute(message, args);
				} catch (error) {
					console.log(error);
					message.reply(localization.response_command_failed);
				}
			}
		} else if (message.mentions.users.has(client.user.id)) {
			// Mentioned bot
			console.log(
				`User ${message.author.username} mentioned the bot in channel ${message.channel.name}.`
			);

			message.reply(
				`Howdy! I'm here to help - use \`${prefix}${help_command}\` for detailed information on how to use me!`
			);
		}
	}
});

client.login(token);
