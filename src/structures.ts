export interface EmbededData {
	key: string,
	text: string,
    vector: number[],
    filePath: string
}

export interface MetaData {
    key: string,
    text: string,
    filePath: string,
}

export interface VectorData {
	id: number,
    vector: number[],
    metadata: MetaData,
}

export interface SearchResult {
    id: number,
    score: number,
    metadata: MetaData,
}

export interface EmbededDatas {
    data: EmbededData,
}

export interface EmbedResult {
    vec: number[],
    tokens: number,
} 

export interface IVectorDB {
    loadMaps(): Promise<void>;

    initialize(indexFilePath: string, dimensions: number, maxElements: number): Promise<boolean>;

    addItem(data: VectorData[]): Promise<void>;

    search(queryVector: number[], top_k: number): Promise<SearchResult[]>;

    save(): Promise<void>;

    count(): Promise<number>;
}