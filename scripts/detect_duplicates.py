import ast
import sys
import json

class Deduplicator(ast.NodeVisitor):
    def __init__(self):
        self.fingerprints = {} 
        self.duplicates = []

    def visit_FunctionDef(self, node):
        # We create a fingerprint using the arguments and the body, IGNORING the function name.
        body_dump = "".join(ast.dump(n) for n in node.body)
        args_dump = ast.dump(node.args)
        fp = args_dump + body_dump
        
        if fp in self.fingerprints:
            self.duplicates.append({
                "canonical": self.fingerprints[fp],
                "duplicate": node.name
            })
        else:
            self.fingerprints[fp] = node.name
            
        self.generic_visit(node)

if __name__ == "__main__":
    with open(sys.argv[1], 'r') as f:
        code = f.read()
    tree = ast.parse(code)
    dedup = Deduplicator()
    dedup.visit(tree)
    print(json.dumps({"duplicates": dedup.duplicates}))