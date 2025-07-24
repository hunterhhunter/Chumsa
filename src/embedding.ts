import { App, TFile } from "obsidian";
import * as murmur from "murmurhash-js";
import { parse_markdown_blocks } from 'smart-blocks/parsers/markdown';
import { EmbedResult, VectorData } from './structures';
import { SmartEmbedModel } from 'smart-embed-model';
import { HNSWLibAdapter } from "./hnswAdapter";


export async function embedAllFiles(app: App, embedModel: SmartEmbedModel, vectordb: HNSWLibAdapter) {
    // 마크다운 파일 전부 불러옴
    const markdownFiles: TFile[] = this.app.vault.getMarkdownFiles();

    // 병렬로 모든 파일에 대한 VectorData 배열 생성
    const allResults = await Promise.all(
        markdownFiles.map(async (file) => {
            const content = await app.vault.cachedRead(file);
            return generateEmbeddingsForMarkdown(embedModel, content, file.path);
        })
    );

    // 생성된 VectorData 배열을 하나로 합치기
    const allVectorData: VectorData[] = allResults.flat();

    // 임베딩 결과 인덱스에 추가
    vectordb.addItem(allVectorData);
    vectordb.save();
}

function hashString(text: string, seed: number) {
    const hashValue: number = murmur.murmur3(text, seed);
    return hashValue;
}

/**
 * 하나의 마크다운 파일 내용(content)을 입력받아, 구조적인 블록으로 나눈 뒤
 * 각 블록을 임베딩하여 결과 배열을 반환하는 비동기 함수입니다.
 * @param model - 초기화된 `SmartEmbedModel` 인스턴스. 텍스트를 벡터로 변환하는 데 사용됩니다.
 * @param content - 분석할 마크다운 파일의 전체 텍스트 내용입니다.
 * @param filePath - 처리 중인 파일의 경로로, 결과 데이터에 메타데이터로 포함됩니다.
 * @returns 각 블록에 대한 임베딩 정보를 담은 `EmbededData` 객체의 배열을 반환하는 Promise.
 */
export async function generateEmbeddingsForMarkdown(model: SmartEmbedModel, content: string, filePath: string): Promise<VectorData[]> {
    const blocks = parse_markdown_blocks(content);
    const embeddingResults = [];

    console.log(`${Object.keys(blocks).length}개의 블록을 찾았습니다.`);

    for (const key in blocks) {
        const [start, end] = blocks[key];
        const blockContent = content.split('\n').slice(start - 1, end).join('\n').trim();

        if (!blockContent) continue;

        console.log(`  - Embedding block: ${key}`);
        const result = await model.embed(blockContent) as EmbedResult;

        const id = hashString(filePath + key, 42);
        
        const vectorData: VectorData = {
            vector: result.vec,
            id: id,
            metadata: {
                key: key,
                text: blockContent,
                filePath: filePath,
            }
        };
        embeddingResults.push(vectorData);
    }

    return embeddingResults;
}