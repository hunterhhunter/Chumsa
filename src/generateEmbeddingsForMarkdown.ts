import { parse_markdown_blocks } from 'smart-blocks/parsers/markdown';
import { EmbededData } from './structures';
import { SmartEmbedModel } from 'smart-embed-model';

interface EmbedResult {
    vec: number[],
    tokens: number,
} 

/**
 * 하나의 마크다운 파일 내용(content)을 입력받아, 구조적인 블록으로 나눈 뒤
 * 각 블록을 임베딩하여 결과 배열을 반환하는 비동기 함수입니다.
 * @param model - 초기화된 `SmartEmbedModel` 인스턴스. 텍스트를 벡터로 변환하는 데 사용됩니다.
 * @param content - 분석할 마크다운 파일의 전체 텍스트 내용입니다.
 * @param filePath - 처리 중인 파일의 경로로, 결과 데이터에 메타데이터로 포함됩니다.
 * @returns 각 블록에 대한 임베딩 정보를 담은 `EmbededData` 객체의 배열을 반환하는 Promise.
 */
export async function generateEmbeddingsForMarkdown(model: SmartEmbedModel, content: string, filePath: string) {
    const blocks = parse_markdown_blocks(content);
    const embeddingResults = [];

    console.log(`${Object.keys(blocks).length}개의 블록을 찾았습니다.`);

    for (const key in blocks) {
        const [start, end] = blocks[key];
        const blockContent = content.split('\n').slice(start - 1, end).join('\n').trim();

        if (!blockContent) continue;

        console.log(`  - Embedding block: ${key}`);
        const result = await model.embed(blockContent) as EmbedResult;

        const embededEach: EmbededData = {
            vector: result.vec,
            text: blockContent,
            key: key,
            filePath: filePath
        };

        embeddingResults.push(embededEach);
    }

    return embeddingResults;
}