function GET_SCORE(type) {
    if (type === "Placement") return 3;
    if (type === "Result") return 2;
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

    INSERT(item) {
        this.HEAP.push(item);
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

    HEAPIFY_UP(idx) {
        let current = idx;
        while (current > 0) {
            const PARENT = Math.floor((current - 1) / 2);
            if (COMPARE_NOTIFICATIONS(this.HEAP[current], this.HEAP[PARENT]) < 0) {
                const TEMP = this.HEAP[current];
                this.HEAP[current] = this.HEAP[PARENT];
                this.HEAP[PARENT] = TEMP;
                current = PARENT;
            } else {
                break;
            }
        }
    }

    HEAPIFY_DOWN(idx) {
        let current = idx;
        const LENGTH = this.HEAP.length;
        while (true) {
            let smallest = current;
            const LEFT = 2 * current + 1;
            const RIGHT = 2 * current + 2;

            if (LEFT < LENGTH && COMPARE_NOTIFICATIONS(this.HEAP[LEFT], this.HEAP[smallest]) < 0) {
                smallest = LEFT;
            }
            if (RIGHT < LENGTH && COMPARE_NOTIFICATIONS(this.HEAP[RIGHT], this.HEAP[smallest]) < 0) {
                smallest = RIGHT;
            }

            if (smallest !== current) {
                const TEMP = this.HEAP[current];
                this.HEAP[current] = this.HEAP[smallest];
                this.HEAP[smallest] = TEMP;
                current = smallest;
            } else {
                break;
            }
        }
    }
}
