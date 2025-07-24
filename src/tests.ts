import { HNSWLibAdapter } from "./hnswAdapter";
import { createMockData, VectorData } from "./structures";

export async function testHNSWLibAdapterRoundTrip() {
		console.log("--- HNSWLibAdapter Round Trip 테스트 시작 ---");
		console.log("Adapter 테스트를 시작합니다. (콘솔 확인)");

		const DB_NAME = "test_index";
		const DIMENSIONS = 1536;
		const MAX_ELEMENTS = 1000;

		// --- 1단계: 초기화 (새 인덱스 생성) ---
		const adapter1 = new HNSWLibAdapter(this.app);
		await adapter1.initialize(DB_NAME, DIMENSIONS, MAX_ELEMENTS);
		console.log("1. 새로운 어댑터 초기화 완료.");
		
		// --- 2단계: 데이터 추가 ---
		// [수정] 제공된 createMockData 함수를 사용하여 테스트 데이터를 생성합니다.
		const mockData: VectorData[] = createMockData(10, DIMENSIONS);
		await adapter1.addItem(mockData);
		const countBeforeSave = await adapter1.count();
		console.log(`2. 목 데이터 ${countBeforeSave}개 추가 완료.`);
		
		// --- 3단계: 검색 (저장 전) ---
		const queryVector = mockData[0].vector;
		const resultsBeforeSave = await adapter1.search(queryVector, 3);
		console.log("3. 저장 전 검색 결과:", resultsBeforeSave.map(r => ({id: r.id, score: r.score})));
		
		// --- 4단계: 저장 ---
		await adapter1.save();
		console.log("4. 인덱스 및 맵 데이터 저장 완료.");

		// --- 5단계: 초기화 (기존 인덱스 로드) ---
		console.log("\n--- 새로운 어댑터 인스턴스로 데이터 로드 테스트 ---");
		const adapter2 = new HNSWLibAdapter(this.app);
		await adapter2.initialize(DB_NAME, DIMENSIONS, MAX_ELEMENTS);
		console.log("5. 기존 데이터로 어댑터 초기화 완료.");

		// --- 6단계: 개수 확인 (로드 후) ---
		const countAfterLoad = await adapter2.count();
		console.log(`6. 로드 후 아이템 개수: ${countAfterLoad}개 (저장 전: ${countBeforeSave}개)`);
		if (countBeforeSave !== countAfterLoad) {
			console.error("🚨 테스트 실패: 저장 전과 후의 아이템 개수가 다릅니다!");
			return;
		}

		// --- 7단계: 검색 (로드 후) ---
		const resultsAfterLoad = await adapter2.search(queryVector, 3);
		console.log("7. 로드 후 검색 결과:", resultsAfterLoad.map(r => ({id: r.id, score: r.score})));
		if (resultsBeforeSave[0].id !== resultsAfterLoad[0].id) {
			console.error("🚨 테스트 실패: 저장 전과 후의 검색 결과가 다릅니다!");
			return;
		}
		
		// --- 8단계: 초기화 (리셋) ---
		await adapter2.resetIndex(MAX_ELEMENTS, DIMENSIONS); // reset 함수에도 maxElements 전달
		const countAfterReset = await adapter2.count();
		console.log(`8. 인덱스 리셋 완료. 리셋 후 아이템 개수: ${countAfterReset}개`);

		console.log("Adapter 테스트를 성공적으로 완료했습니다!");
		console.log("--- HNSWLibAdapter Round Trip 테스트 성공 ---");
	}