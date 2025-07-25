export function calculateCentroid(vectors: number[][]): number[] {
    if (!vectors || vectors.length === 0) {
        return [];
    }

    const dimension = vectors[0].length;
    const centroid = new Array(dimension).fill(0);

    for (const vec of vectors) {
        if (vec.length !== dimension) continue;
        for (let i=0; i<dimension; i++) {
            centroid[i] += vec[i];
        }
    }

    for (let i = 0; i < dimension; i++) {
        centroid[i] / vectors.length;
    }

    return centroid;
}