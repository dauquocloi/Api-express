const { Connect, Disconnect } = require('./MongoConnect');
const Entity = require('../models');

// connect to your Atlas deployment
Connect(process.env.DB_NAME);

async function generateIndex() {
	try {
		// set namespace

		// define your MongoDB Search index
		const index = {
			name: 'tasksIndex',
			definition: {
				/* search index definition fields */
				mappings: {
					dynamic: false,
					fields: {
						taskContent: {
							type: 'autocomplete',
							analyzer: 'lucene.standard',
							tokenization: 'edgeGram',
							minGrams: 2,
							maxGrams: 15,
							foldDiacritics: true,
							similarity: { type: 'bm25' },
						},
						detail: {
							type: 'autocomplete',
							analyzer: 'lucene.standard',
							tokenization: 'edgeGram',
							minGrams: 2,
							maxGrams: 15,
							foldDiacritics: true,
							similarity: { type: 'bm25' },
						},
					},
				},
			},
		};

		// run the helper method
		const result = await Entity.TasksEntity.createSearchIndex(index);
		console.log('New index name: ' + result);
	} finally {
		await Disconnect();
	}
}

generateIndex().catch(console.error);
