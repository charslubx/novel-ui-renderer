import { describe, expect, it } from "vitest";
import { XFeedRenderer } from "../src/renderers/social/x-feed";
import { XNotificationsRenderer } from "../src/renderers/social/x-notifications";
import { XPostRenderer } from "../src/renderers/social/x-post";
import { XTrendsRenderer } from "../src/renderers/social/x-trends";

describe("X renderers",()=>{
  const post={displayName:"User",handle:"user",timestamp:"1小时",text:"正文",media:[{type:"image" as const,alt:"图片"}],likes:12};
  it("renders a dark single post with media",()=>{expect(XPostRenderer.validate(post)).toBe(true);expect(XPostRenderer.render(post,{raw:"",debug:false}).querySelector(".x-media")).not.toBeNull();});
  it("renders a continuous feed",()=>{const props={posts:[post]};expect(XFeedRenderer.validate(props)).toBe(true);expect(XFeedRenderer.render(props,{raw:"",debug:false}).querySelectorAll(".x-post")).toHaveLength(1);});
  it("renders notifications",()=>{const props={notifications:[{id:"1",displayName:"User",timestamp:"1分",text:"通知"}]};expect(XNotificationsRenderer.validate(props)).toBe(true);expect(XNotificationsRenderer.render(props,{raw:"",debug:false}).querySelectorAll(".x-notification")).toHaveLength(1);});
  it("renders trends",()=>{const props={trends:[{id:"1",category:"韩国 的趋势",title:"话题"}]};expect(XTrendsRenderer.validate(props)).toBe(true);expect(XTrendsRenderer.render(props,{raw:"",debug:false}).querySelectorAll(".x-trend")).toHaveLength(1);});
});
