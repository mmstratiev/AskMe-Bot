const discord = require('discord.js');
const localization = require('./localization.json');
const utilities = require('./utilities.js');
const { prefix, token } = require('./config.json');
const { help_command } = require('./commands.json');

const client = new discord.Client();

function AddMemberToDatabase(member) {
	if (!member.bot) {
		let db = utilities.openDatabase();
		let insertUser = db.prepare(
			'INSERT OR REPLACE INTO users VALUES(?,?,?)'
		);

		insertUser.run(
			[member.user.id, member.guild.id, member.user.tag],
			(err) => {
				if (err) {
					console.log(err);
				}
				insertUser.finalize();
			}
		);
	}
}

function RemoveMemberFromDatabase(member) {
	if (!member.bot) {
		let db = utilities.openDatabase();
		let removeUser = db.prepare(
			'DELETE FROM users WHERE user_id=? AND server_id=?'
		);

		removeUser.run([member.user.id, member.guild.id], (err) => {
			if (err) {
				console.log(err);
			}
			removeUser.finalize();
		});
	}
}

function AddServerToDatabase(guild) {
	let db = utilities.openDatabase();
	let insertServer = db.prepare('INSERT OR REPLACE INTO servers VALUES(?,?)');

	insertServer.run([guild.id, guild.name], (err) => {
		if (err) {
			console.log(err);
		} else {
			for (const [memberID, member] of guild.members.cache) {
				AddMemberToDatabase(member);
			}
		}
		insertServer.finalize();
	});
}

function RemoveServerFromDatabase(guild) {
	let db = utilities.openDatabase();
	let deleteServer = db.prepare('DELETE FROM servers WHERE server_id=?');

	deleteServer.run([guild.id], (err) => {
		if (err) {
			console.log(err);
		} else {
			for (const [memberID, member] of guild.members.cache) {
				RemoveMemberFromDatabase(member);
			}
		}
		deleteServer.finalize();
	});
}

client.commands = utilities.getCommandsCollection();
client.on('ready', () => {
	client.user.setActivity('people Tag Me!', { type: 'WATCHING' });

	// Create the database tables and fills them
	let db = utilities.openDatabase();
	CreateServersTable();

	function CreateServersTable() {
		db.run('DROP TABLE IF EXISTS servers', () => {
			db.run(
				'CREATE TABLE IF NOT EXISTS servers(server_id INTEGER PRIMARY KEY, server_name TEXT NOT NULL)',
				CreateUsersTable
			);
		});
	}

	function CreateUsersTable() {
		db.run('DROP TABLE IF EXISTS users', () => {
			db.run(
				'CREATE TABLE IF NOT EXISTS users(user_id INTEGER PRIMARY KEY, server_id INTEGER NOT NULL, user_name TEXT NOT NULL, UNIQUE(user_id, server_id))',
				CreateQuestionsTable
			);
		});
	}

	function CreateQuestionsTable() {
		// Questions table shouldn't be deleted so that server based settings can be persistent
		db.run(
			'CREATE TABLE IF NOT EXISTS questions(question_id INTEGER PRIMARY KEY AUTOINCREMENT, server_id INTEGER NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL, UNIQUE(server_id, question))'
		);
		FillTables();
	}

	function FillTables() {
		for (const [guildID, guild] of client.guilds.cache) {
			AddServerToDatabase(guild);
		}
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
				const command = client.commands.get(commandName);

				// if (!command.args.includes(args.length)) {
				// 	// invalid number of arguments
				// 	var reply = `${localization.response_invalid_argument_count}\n${localization.response_proper_command} \`${prefix}${command.name} ${command.usage}\``;
				// 	message.reply(reply);
				// } else {
				// 	// proper command usage, execute command
				// 	try {
				// 		command.execute(message, args);
				// 	} catch (error) {
				// 		console.error(error);
				// 		message.reply(localization.response_command_failed);
				// 	}
				// }
				command.execute(message, args);
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
