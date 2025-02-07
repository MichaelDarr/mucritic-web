import * as tf from '@tensorflow/tfjs';
import request from 'request';
import { ActionTree } from 'vuex';
import {
    Album,
    AlbumsState,
    EncodedAlbum,
} from './types';
import { RootState } from '../types';


export const actions: ActionTree<AlbumsState, RootState> = {
    async fetch({ commit, state }): Promise<void> {
        const csvRaw: string = await new Promise((resolve, reject): void => {
            request(
                state.albumFile,
                (error, _, body): void => {
                    if(error != null) {
                        reject(new Error(`album data failed to load: ${error}`));
                    } else {
                        resolve(body);
                    }
                },
            );
        });
        const csvRows = csvRaw.split('\n');
        csvRows.shift();
        const albums = csvRows.map((csvRow): Album => {
            const rowData = csvRow.split(',');
            return {
                spotifyId: rowData[0],
                popularity: Number(rowData[1]),
                rymRating: Number(rowData[2]),
                releaseYear: Number(rowData[3]),
                encoding: [
                    Number(rowData[4]),
                    Number(rowData[5]),
                    Number(rowData[6]),
                    Number(rowData[7]),
                    Number(rowData[8]),
                    Number(rowData[9]),
                    Number(rowData[10]),
                    Number(rowData[11]),
                    Number(rowData[12]),
                    Number(rowData[13]),
                    Number(rowData[14]),
                    Number(rowData[15]),
                    Number(rowData[16]),
                    Number(rowData[17]),
                    Number(rowData[18]),
                    Number(rowData[19]),
                ],
                userScore: null,
                userScoreAdjusted: null,
                imageUrl: null,
                spotifyUrl: null,
                name: null,
                artist: null,
            };
        });
        commit('setAlbums', albums);
    },
    async rate({
        commit,
        rootState,
        state,
    }): Promise<void> {
        if(
            rootState.tasteModel == null
            || rootState.tasteModelAdjusted == null
        ) throw new Error('Tried to rate albums before model creation');
        if(state.albums == null) throw new Error('No albums to rate');

        const model: tf.Sequential = rootState.tasteModel;
        const adjustedModel: tf.Sequential = rootState.tasteModelAdjusted;
        const { albums } = state;

        const encodings = albums.map((album): EncodedAlbum => album.encoding);
        const dataTensor = tf.tensor2d(encodings, [encodings.length, 16]);

        const scoreTensor = model.predict(dataTensor) as tf.Tensor;
        const scoresRaw = await scoreTensor.array() as number[][];
        const scores = scoresRaw.map(
            (scoreArr): number => ((scoreArr[0] * 4.5) + 0.5) * 2,
        );

        const scoreTensorAdjusted = adjustedModel.predict(dataTensor) as tf.Tensor;
        const scoresRawAdjusted = await scoreTensorAdjusted.array() as number[][];
        const scoresAdjusted = scoresRawAdjusted.map((adjScoreArr): number => adjScoreArr[0]);

        commit('setScores', {
            scores,
            scoresAdjusted,
        });
    },
};
