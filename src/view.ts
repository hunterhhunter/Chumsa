import { ItemView, WorkspaceLeaf } from "obsidian";

export const MY_VIEW_TYPE = "my-plugin-side-view";

export class MySideView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return MY_VIEW_TYPE;
    }

    getDisplayText(): string {
        return "첨사 검색 결과";
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h4", { text: "관련 노트를 찾아보세요." });
    }

    async onClose(): Promise<void> {
        // Nothing to clean up.
    }

    updateContent(results: {id: string ,text: string}[]) {
        const container = this.containerEl.children[1];
        container.empty(); // 이전 내용을 모두 지움

        if (results.length === 0) {
            container.createEl("p", { text: "관련된 내용이 없습니다." });
            return;
        }

        // 검색 결과를 바탕으로 새로운 HTML 요소를 생성
        for (const result of results) {
            const div = container.createEl("div", { cls: "search-result-item" });
            div.createEl("h5", { text: result.id });
            div.createEl("p", { text: result.text.substring(0, 100) + "..." });
        }
    }
}