require('dotenv').config();
const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
    name: String,
    date: Date
});

const TestModel = mongoose.model('TestCollection', testSchema);

async function runTest() {
    console.log('MongoDBに接続開始');

    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('接続成功');
        console.log('データの書き込みを開始');
        const newEntry = new TestModel({
            name: 'Connection Test',
            date: new Date()
        });
        const savedDoc = await newEntry.save();
        console.log('保存完了:', savedDoc);
        console.log('保存したデータを検索...');
        const foundDoc = await TestModel.findOne({ _id: savedDoc._id });
        console.log('データが見つかりました:', foundDoc);
        console.log('テストデータの削除を開始');
        await TestModel.deleteOne({ _id: savedDoc._id });
        console.log('削除完了');

        console.log('すべてのテストが成功');

    } catch (error) {
        console.error('エラー:');
        console.error(error);
    } finally {
        await mongoose.disconnect();
        console.log('切断');
    }
}

runTest();