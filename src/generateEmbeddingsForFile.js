import { parse_markdown_blocks } from 'smart-blocks/parsers/markdown';
import * as fs from 'fs/promises';

/**
 * 지정된 파일 경로의 마크다운 문서를 읽어, 블록별로 임베딩을 생성합니다.
 * @param {SmartEmbedModel} model - 초기화된 SmartEmbedModel 인스턴스
 * @param {string} filePath - 분석할 파일의 경로
 * @returns {Promise<Object>} 블록 내용을 키로, 벡터를 값으로 하는 객체
 */
async function generateEmbeddingsForFile(model, filePath) {
    console.log(`\nProcessing file: ${filePath}`);

    const fileContent = await fs.readFile(filePath, 'utf-8');
    const blocks = parse_markdown_blocks(fileContent);
    const embeddingResults = {};

    console.log(`${Object.keys(blocks).length}개의 블록을 찾았습니다.`);

    for (const key in blocks) {
        const [start, end] = blocks[key];
        const blockContent = fileContent.split('\n').slice(start - 1, end).join('\n').trim();

        if (!blockContent) continue;

        console.log(`  - Embedding block: ${key}`);
        const result = await model.embed(blockContent);
        embeddingResults[blockContent] = result.vec;
    }

    return embeddingResults;
}