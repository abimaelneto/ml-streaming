import { prepareRunChecker } from "../../../../lib/shared/util.js";
const { shouldRun: scrollShouldRun } = prepareRunChecker({ timerDelay: 200 });
const { shouldRun: clickShouldRun } = prepareRunChecker({ timerDelay: 300 });
export default class HandGestureController {
  #itemsPerLine = 5;
  #view;
  #service;
  #camera;
  #lastDirection = { direction: "", y: window.pageYOffset };
  constructor({ view, service, camera }) {
    this.#view = view;
    this.#service = service;
    this.#camera = camera;
  }

  async init() {
    return this.#loop();
  }
  #scrollPage(direction) {
    const pixelsPerScroll = 100;
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    const documentMaxHeight = Math.max(
      htmlElement.clientHeight,
      htmlElement.scrollHeight,
      htmlElement.offsetHeight,
      bodyElement.scrollHeight,
      bodyElement.offsetHeight
    );

    if (this.#lastDirection.direction === direction) {
      const nextValue =
        direction === "scroll-down"
          ? this.#lastDirection.y + pixelsPerScroll
          : this.#lastDirection.y - pixelsPerScroll;

      if (nextValue < 0 || nextValue > documentMaxHeight) return;
      this.#lastDirection.y = nextValue;
      this.#view.scrollPage(this.#lastDirection.y);
    } else {
      this.#lastDirection.direction = direction;
    }
  }
  async #estimateHands() {
    try {
      const hands = await this.#service.estimateHands(this.#camera.video);
      this.#view.clear();
      if (hands?.length) this.#view.drawResults(hands);
      for await (const { event, x, y } of this.#service.detectGestures(hands)) {
        if (event.includes("click")) {
          if (!clickShouldRun()) continue;
          this.#view.clickOnElement(x, y);
          continue;
        }
        if (event.includes("scroll")) {
          if (!scrollShouldRun()) continue;
          this.#scrollPage(event);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  async #loop() {
    await this.#service.initializeDetector();
    await this.#estimateHands();
    this.#view.loop(this.#loop.bind(this));
  }
  static async initialize(deps) {
    const controller = new HandGestureController(deps);
    return controller.init();
  }
}
