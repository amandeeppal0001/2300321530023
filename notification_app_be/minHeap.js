function GET_SCORE(TYPE) {
    if (TYPE === "Placement") return 3;
    if (TYPE === "Result") return 2;
    return 1;
}

export function COMPARE_NOTIFICATIONS(A, B) {
    const SCORE_A = GET_SCORE(A.Type);
    const SCORE_B = GET_SCORE(B.Type);
    if (SCORE_A !== SCORE_B) {
        return SCORE_A - SCORE_B;
    }
    const TIME_A = new Date(A.Timestamp).getTime();
    const TIME_B = new Date(B.Timestamp).getTime();
    return TIME_A - TIME_B;
}

export class MIN_HEAP {
    constructor() {
        this.HEAP = [];
    }

    PEEK() {
        return this.HEAP[0] || null;
    }

    SIZE() {
        return this.HEAP.length;
    }

    INSERT(ITEM) {
        this.HEAP.push(ITEM);
        this.HEAPIFY_UP(this.HEAP.length - 1);
    }

    EXTRACT_MIN() {
        if (this.HEAP.length === 0) return null;
        const MIN = this.HEAP[0];
        const LAST = this.HEAP.pop();
        if (this.HEAP.length > 0) {
            this.HEAP[0] = LAST;
            this.HEAPIFY_DOWN(0);
        }
        return MIN;
    }

    HEAPIFY_UP(IDX) {
        let CURRENT = IDX;
        while (CURRENT > 0) {
            const PARENT = Math.floor((CURRENT - 1) / 2);
            if (COMPARE_NOTIFICATIONS(this.HEAP[CURRENT], this.HEAP[PARENT]) < 0) {
                const TEMP = this.HEAP[CURRENT];
                this.HEAP[CURRENT] = this.HEAP[PARENT];
                this.HEAP[PARENT] = TEMP;
                CURRENT = PARENT;
            } else {
                break;
            }
        }
    }

    HEAPIFY_DOWN(IDX) {
        let CURRENT = IDX;
        const LENGTH = this.HEAP.length;
        while (true) {
            let SMALLEST = CURRENT;
            const LEFT = 2 * CURRENT + 1;
            const RIGHT = 2 * CURRENT + 2;

            if (LEFT < LENGTH && COMPARE_NOTIFICATIONS(this.HEAP[LEFT], this.HEAP[SMALLEST]) < 0) {
                SMALLEST = LEFT;
            }
            if (RIGHT < LENGTH && COMPARE_NOTIFICATIONS(this.HEAP[RIGHT], this.HEAP[SMALLEST]) < 0) {
                SMALLEST = RIGHT;
            }

            if (SMALLEST !== CURRENT) {
                const TEMP = this.HEAP[CURRENT];
                this.HEAP[CURRENT] = this.HEAP[SMALLEST];
                this.HEAP[SMALLEST] = TEMP;
                CURRENT = SMALLEST;
            } else {
                break;
            }
        }
    }
}
