import { App, TFile } from "obsidian";
import * as murmur from "murmurhash-js";
import { parse_markdown_blocks } from 'smart-blocks/parsers/markdown';
import { EmbedResult, VectorData } from './structures';
import { SmartEmbedModel } from 'smart-embed-model';
import { HNSWLibAdapter } from "./hnswAdapter";

// TODO: 전의 내용과 같으면 임베딩 안하고, 다를 시 임베딩하는 로직 추가
// DONE: 하나의 문서 임베딩하는 함수 생성 후 분리 - 밑의 generrateEmbeddingForMarkdown함수 참조
export async function embedAllFiles(app: App, embedModel: SmartEmbedModel, vectordb: HNSWLibAdapter) {
	const fileToBlocksMap: Map<string, Record<string, [number, number]>> = new Map();
    
    // 마크다운 파일 전부 불러옴
    const markdownFiles: TFile[] = this.app.vault.getMarkdownFiles();

    // 병렬로 모든 파일에 대한 VectorData 배열 생성
    const allResults = await Promise.all(
        markdownFiles.map(async (file) => {
            const {embeddingResults, record} = await embedSingleFile(app, embedModel, file);
            fileToBlocksMap.set(file.path, record);
            return embeddingResults;
        })
    );

    // 생성된 VectorData 배열을 하나로 합치기
    const allVectorData: VectorData[] = allResults.flat();

    // 임베딩 결과 인덱스에 추가
    vectordb.addItem(allVectorData);
    vectordb.save();

    console.log(`전체 fileToBlockMap Keys: ${fileToBlocksMap.keys}`);
    console.log(`전체 fileToBlockMap Values: ${fileToBlocksMap.values}`);

    return fileToBlocksMap;
}

export function hashString(text: string, seed: number) {
    const hashValue: number = murmur.murmur3(text, seed);
    return hashValue;
}

export async function embedSingleFile(app: App, model: SmartEmbedModel, file: TFile) {
    const record: Record<string, [number, number]> = {};
    const content = await app.vault.cachedRead(file);
    const blocks = parse_markdown_blocks(content);
    const embeddingResults = [];

    console.log(`${Object.keys(blocks).length}개의 블록을 찾았습니다.`);

    for (const key in blocks) {
        const [start, end] = blocks[key];
        record[key] = [start, end];
        const blockContent = content.split('\n').slice(start - 1, end).join('\n').trim();

        if (!blockContent) continue;

        //console.log(`  - Embedding key: ${key}`);
        //console.log(`  - Embedding block: ${filePath}`);
        const result = await model.embed(blockContent) as EmbedResult;

        const id = hashString(file.path + key, 42);
        
        const vectorData: VectorData = {
            vector: result.vec,
            id: id,
            metadata: {
                key: key,
                text: blockContent,
                filePath: file.path,
            }
        };
        embeddingResults.push(vectorData);
    }
    console.log(`싱글 임베딩 레코드 결과: ${record}`);

    return { embeddingResults, record };
}