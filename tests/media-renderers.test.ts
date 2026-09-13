import { describe, expect, it } from "vitest";
import { InstagramRenderer } from "../src/renderers/social/instagram-post";
import { OnlyFansRenderer } from "../src/renderers/social/onlyfans-post";
import {
  PornhubRenderer,
  YouTubeRenderer,
} from "../src/renderers/video/video-page";

describe("media renderers", () => {
  it("renders an Instagram post", () => {
    const props = {
      username: "user",
      text: "caption",
      timestamp: "1小时前",
      imageAlt: "image",
    };
    expect(InstagramRenderer.validate(props)).toBe(true);
    expect(
      InstagramRenderer.render(props, { raw: "", debug: false }).querySelector(
        ".instagram__media",
      ),
    ).not.toBeNull();
    expect(InstagramRenderer.render(props,{raw:"",debug:false}).querySelector(".instagram__avatar svg")).not.toBeNull();
  });
  it("renders an OnlyFans creator post", () => {
    const props = {
      creator: "Creator",
      handle: "@creator",
      timestamp: "now",
      text: "post",
      subscribed: true,
      comments: [{id:"c1",displayName:"Fan",timestamp:"1分钟前",text:"很喜欢这组照片",likes:3}],
    };
    expect(OnlyFansRenderer.validate(props)).toBe(true);
    expect(
      OnlyFansRenderer.render(props, { raw: "", debug: false }).textContent,
    ).toContain("已订阅");
    expect(OnlyFansRenderer.render(props,{raw:"",debug:false}).querySelectorAll(".platform-comment")).toHaveLength(1);
    expect(OnlyFansRenderer.render(props,{raw:"",debug:false}).querySelectorAll(".novel-default-avatar svg").length).toBeGreaterThanOrEqual(2);
  });
  for (const renderer of [YouTubeRenderer, PornhubRenderer])
    it(`renders ${renderer.variant}`, () => {
      const props = {
        title: "Video",
        channel: "Channel",
        duration: "10:00",
        views: "1000",
        uploaded: "today",
        comments: [{id:"c1",displayName:"Viewer",text:"Great video"}],
      };
      expect(renderer.validate(props)).toBe(true);
      expect(
        renderer
          .render(props, { raw: "", debug: false })
          .querySelector(".video-page__player"),
      ).not.toBeNull();
      expect(renderer.render(props,{raw:"",debug:false}).querySelectorAll(".platform-comment")).toHaveLength(1);
      expect(renderer.render(props,{raw:"",debug:false}).querySelectorAll(".novel-default-avatar svg").length).toBeGreaterThanOrEqual(2);
    });
});
