const {paginateResults} = require('./utils');

module.exports = {
	Query: {
		launches: async (parent, args, context, info) => {
			const pageSize = args.pageSize || 20;
			const after = args.after;

			const allLaunches = await context.dataSources.launchApi.getAllLaunches();

			// we want these in reverse chronological order
			allLaunches.reverse();

			const launches = paginateResults({
				results: allLaunches,
				pageSize,
				after
			});


			const cursor = launches.length ? launches[launches.length - 1].cursor : null;
			const finalCursor = allLaunches[allLaunches.length - 1].cursor;

			return {
				launches,
				cursor,

				// if the cursor of the end of the paginated results is the same
				// as the last item in _all_ results, then there are no more
				// results after this
				hasMore: cursor !== finalCursor
			};
		},

		launch(parent, args, context, info) {
			return context.dataSources.launchApi.getLaunchById({
				launchId: args.id
			});
		},

		me(parent, args, context, info) {
			return context.dataSources.userApi.findOrCreateUser();
		}
	},



	Mission: {
		missionPatch: (parent, args, context, info) => {
			if (args.size === 'SMALL') return parent.missionPatchSmall;
			return parent.missionPatchLarge;
		}
	},



	Launch: {
		isBooked: async (parent, args, context, info) => {
			return context.dataSources.userApi.isBookedOnLaunch({
				launchId: launch.id
			});
		}
	},


	User: {
		trips: async (parent, args, context, info) => {
			const launchIds = await context.dataSources.userApi.getLaunchIdsByUser();
			if (!launchIds.length) return [];

			// look up those launches by their ids
			return dataSources.launchApi.getLaunchesByIds({
				launchIds
			}) || [];
		}
	},



	Mutation: {
		login: async (parent, args, context, info) => {
			const user = await context.dataSources.userApi.findOrCreateUser({
				email: args.email
			});

			if (user) return Buffer.from(args.email).toString('base64');
		},

		bookTrips: async (parent, args, context, info) => {
			const launchIds = args.launchIds;

			const results = await context.dataSources.userApi.bookTrips({
				launchIds
			});

			const launches = await context.dataSources.launchApi.getLaunchesByIds({
				launchIds
			});


			const isOk = results && results.length === launchIds.length;

			let message = 'trips booked successfully';
			if (!isOk) {
				const failedIds = launchIds.filter((id) => !results.includes(id));
				message = `the following launches couldn't be booked: ${failedIds}`;
			}

			return {
				success: isOk,
				message,

				launches
			}
		},

		cancelTrip: async (parent, args, context, info) => {
			const launchId = args.launchId;

			const result = await context.dataSources.userApi.cancelTrip({
				launchId
			});

			if (!result) {
				return {
					message: 'failed to cancel trip',
					success: false
				};
			}

			const launch = await dataSources.launchApi.getLaunchById({
				launchId
			});

			return {
				message: 'trip cancelled',
				success: true,

				launches: [launch]
			}
		}
	}
}
