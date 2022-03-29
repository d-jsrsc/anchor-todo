import { Tree as ReactTree, Node as TreeNode } from "@jsrsc/react-tree";

const tree: TreeNode = {
  children: [
    {
      name: "p1",
      children: [
        {
          name: "pp1",
          children: [
            {
              name: "ppp1-0",
              children: [],
            },
            {
              name: "ppp1-1",
              children: [],
            },
            {
              name: "ppp1-2",
              children: [
                {
                  name: "pppp1-2-0",
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "p2",
      children: [{ name: "pp2", children: [] }],
    },
  ],
  name: "root",
};

function App() {
  return (
    <div className="App">
      <ReactTree name="ReactTree" data={tree} />
    </div>
  );
}

export default App;
