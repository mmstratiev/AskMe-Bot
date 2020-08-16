const discord = require('discord.js');
const localization = require('./localization.json');
const utilities = require('./utilities.js');
const { prefix, token } = require('./config.json');
const { help_command } = require('./commands.json');

const paypalServer = require('./paypal/paypal_server');
const paypalServerDomain = require('./paypal/paypal_server_domain');

const client = new discord.Client();

paypalServer.listen(paypalServerDomain.port, () => {
	console.log(
		`Paypal Server running in ${paypalServerDomain.address}:${paypalServerDomain.port}`
	);
});

function AddMemberToDatabase(member) {
	if (!member.bot) {
		let db = utilities.openDatabase();
		try {
			db.prepare(
				`INSERT INTO users(id, server_id, user_name) VALUES(?,?,?)
				ON CONFLICT(id) DO UPDATE SET server_id=?, user_name=?`
			).run([
				member.user.id,
				member.guild.id,
				member.user.tag,
				member.guild.id,
				member.user.tag,
			]);

			db.prepare(
				`INSERT INTO carts(server_id, user_id) VALUES(?,?)
				ON CONFLICT(server_id, user_id) DO NOTHING`
			).run([member.guild.id, member.user.id]);
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
		db.prepare(
			`INSERT INTO servers(id, server_name) VALUES(?,?)
			ON CONFLICT(id) DO UPDATE SET server_name=?`
		).run([guild.id, guild.name, guild.name]);

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
	db.prepare(
		`CREATE TABLE IF NOT EXISTS servers(
			id INTEGER PRIMARY KEY, 
			server_name TEXT NOT NULL)`
	).run();

	db.prepare(
		`CREATE TABLE IF NOT EXISTS users(
			id INTEGER PRIMARY KEY, 
			server_id INTEGER NOT NULL, 
			user_name TEXT NOT NULL, 
			UNIQUE(id, server_id), 
			FOREIGN KEY (server_id) references servers(id) ON DELETE CASCADE)`
	).run();

	// carts from previous sessions are emptied on bot startup
	db.prepare('DROP TABLE IF EXISTS carts').run();
	db.prepare(
		`CREATE TABLE IF NOT EXISTS carts(
			id INTEGER PRIMARY KEY AUTOINCREMENT, 
			server_id INTEGER NOT NULL, 
			user_id INTEGER NOT NULL, 
			UNIQUE(server_id, user_id), 
			FOREIGN KEY (server_id) references servers(id) ON DELETE CASCADE,
			FOREIGN KEY (user_id) references users(id) ON DELETE CASCADE)`
	).run();

	db.prepare(
		`CREATE TABLE IF NOT EXISTS cart_items(
			id INTEGER PRIMARY KEY AUTOINCREMENT, 
			cart_id INTEGER NOT NULL, 
			item_id INTEGER NOT NULL, 
			item_quantity INTEGER NOT NULL,
			UNIQUE(cart_id, item_id),
			FOREIGN KEY (cart_id) references carts(id) ON DELETE CASCADE,
			FOREIGN KEY (item_id) references items(id) ON DELETE CASCADE)`
	).run();

	db.prepare(
		`CREATE TABLE IF NOT EXISTS categories(
			id INTEGER PRIMARY KEY AUTOINCREMENT, 
			server_id INTEGER NOT NULL, 
			category_name TEXT NOT NULL, 
			category_description TEXT NOT NULL, 
			UNIQUE(server_id, category_name), 
			FOREIGN KEY (server_id) references servers(id) ON DELETE CASCADE)`
	).run();

	db.prepare(
		`CREATE TABLE IF NOT EXISTS items(
			id INTEGER PRIMARY KEY AUTOINCREMENT, 
			server_id INTEGER NOT NULL, 
			category_id INTEGER NOT NULL, 
			item_name TEXT NOT NULL, 
			item_description TEXT NOT NULL, 
			item_price REAL NOT NULL, 
			UNIQUE(server_id, item_name), 
			FOREIGN KEY (server_id) references servers(id) ON DELETE CASCADE,
			FOREIGN KEY (category_id) references categories(id) ON DELETE CASCADE)`
	).run();
	db.prepare(
		`CREATE TABLE IF NOT EXISTS questions(
			id INTEGER PRIMARY KEY AUTOINCREMENT, 
			server_id INTEGER NOT NULL, 
			question TEXT NOT NULL, 
			answer TEXT NOT NULL, 
			UNIQUE(server_id, question), 
			FOREIGN KEY (server_id) references servers(id) ON DELETE CASCADE)`
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
				const command = client.commands.get(commandName);
				command.execute(message, args).catch((error) => {
					console.error(error);
					message.reply(localization.response_command_failed);
				});
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
