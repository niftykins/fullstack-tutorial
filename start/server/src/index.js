const {ApolloServer} = require('apollo-server');
const isEmail = require('isemail');

const typeDefs = require('./schema');
const resolvers = require('./resolvers');
const {createStore} = require('./utils');

const LaunchApi = require('./datasources/launch');
const UserApi = require('./datasources/user');

const store = createStore();

const server = new ApolloServer({
	typeDefs,
	resolvers,

	dataSources: () => ({
		userApi: new UserApi({store}),
		launchApi: new LaunchApi(),
	}),

	context: async ({req}) => {
		// simple auth check on every request
		const auth = req.headers && req.headers.authorization || '';

		const email = Buffer.from(auth, 'base64').toString('ascii');
		if (!isEmail.validate(email)) {
			return {user: null};
		}

		// find a user by their email
		const users = await store.users.findOrCreate({
			where: {email}
		});
		const user = users && users[0] || null;

		return {
			user: {
				...user.dataValues
			}
		};
	}
});

server.listen().then((info) => {
	console.log(`🚀 Server ready at ${info.url}`);
});
